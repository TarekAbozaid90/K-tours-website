'use strict';

const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const SESSION_SECRET_BASE = String(process.env.SESSION_SECRET || '');
const VISITOR_BOOK_ENABLED = String(process.env.VISITOR_BOOK_ENABLED || 'true').toLowerCase() === 'true';
const VISITOR_RETENTION_DAYS = 30;
const MAX_STORED_IMAGE_BYTES = 650 * 1024 * 1024; // Keep headroom within Neon Free's 1 GB database allowance.
const CONSENT_VERSION = '2026-11-22-v1';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Add your Neon PostgreSQL connection string in Render Environment.');
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) throw new Error('Set ADMIN_PASSWORD in Render Environment (at least 12 characters).');
if (NODE_ENV === 'production' && SESSION_SECRET_BASE.length < 32) throw new Error('Set a long random SESSION_SECRET in Render Environment.');

const rawIpKey = String(process.env.VISITOR_IP_ENCRYPTION_KEY || 'local-development-only-key-change-before-deploy');
if (NODE_ENV === 'production' && VISITOR_BOOK_ENABLED && rawIpKey.length < 32) {
  throw new Error('Set VISITOR_IP_ENCRYPTION_KEY in Render Environment to a generated secret of at least 32 characters.');
}
// Render's generated environment secret is treated as opaque text and derived into a 256-bit AES key.
const VISITOR_IP_KEY = crypto.createHash('sha256').update(rawIpKey).digest();

// A credential change rotates the session signing key, invalidating old admin sessions.
const SESSION_SECRET = crypto.createHmac('sha256', SESSION_SECRET_BASE || 'local-development-session-secret-change-before-deploy')
  .update(`${ADMIN_USERNAME.toLowerCase()}\0${ADMIN_PASSWORD}`)
  .digest('hex');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});
pool.on('error', error => console.error('Unexpected PostgreSQL pool error:', error.message));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Render's public proxy; req.ip is the client address supplied by Render.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '40kb' }));
app.use(session({
  name: 'ktours.admin.sid',
  store: new PgSession({ pool, tableName: 'admin_sessions', createTableIfMissing: true, pruneSessionInterval: 15 * 60 }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 12
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' }
});
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many review submissions. Please try again later.' }
});
const visitorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Visitor logging limit reached. Please try again later.' }
});

function timingSafeStringEqual(value, expected) {
  const a = crypto.createHash('sha256').update(String(value ?? '')).digest();
  const b = crypto.createHash('sha256').update(String(expected ?? '')).digest();
  return crypto.timingSafeEqual(a, b);
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) return next();
  return res.status(401).json({ error: 'Please sign in to the K-tours admin dashboard.' });
}
function checkSameOrigin(req, res, next) {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Request origin is not allowed.' });
  } catch {
    return res.status(403).json({ error: 'Invalid request origin.' });
  }
  next();
}
app.use('/api', checkSameOrigin);

// Images are stored as BYTEA in PostgreSQL so the free Render web-service filesystem
// can remain ephemeral. Keep uploads small to fit a small review/gallery database.
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1.5 * 1024 * 1024, files: 2, fields: 8, fieldSize: 10_000 },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) return cb(new Error('Only JPG, PNG and WebP images are accepted.'));
    cb(null, true);
  }
});

function validateImageBuffer(file) {
  const b = file?.buffer;
  if (!Buffer.isBuffer(b) || !b.length) throw Object.assign(new Error('The uploaded image is empty.'), { status: 400 });
  const isJpeg = b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isPng = b.length > 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  const valid = (file.mimetype === 'image/jpeg' && isJpeg) || (file.mimetype === 'image/png' && isPng) || (file.mimetype === 'image/webp' && isWebp);
  if (!valid) throw Object.assign(new Error('The uploaded file does not match a supported image format.'), { status: 400 });
}

async function ensureImageCapacity(db, files) {
  const incomingBytes = (files || []).reduce((sum, file) => sum + (file?.buffer?.length || 0), 0);
  if (!incomingBytes) return;
  // Serialize upload capacity checks to avoid concurrent uploads exceeding the free-tier image budget.
  await db.query('SELECT pg_advisory_xact_lock(72619021)');
  const { rows } = await db.query(`
    SELECT
      COALESCE((SELECT SUM(octet_length(image_data)) FROM review_photos), 0) +
      COALESCE((SELECT SUM(octet_length(image_data)) FROM gallery_assets), 0) AS used_bytes
  `);
  if (Number(rows[0].used_bytes || 0) + incomingBytes > MAX_STORED_IMAGE_BYTES) {
    throw Object.assign(new Error('The free photo-storage allowance is almost full. Please remove older photos or reduce image sizes before uploading.'), { status: 507 });
  }
}

function publicReview(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    rating: row.rating,
    message: row.message,
    created_at: row.created_at,
    photo_urls: (row.photo_ids || []).map(id => `/media/review-photo/${encodeURIComponent(id)}`)
  };
}
function publicGallery(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    created_at: row.created_at,
    image_url: `/media/gallery/${encodeURIComponent(row.id)}`
  };
}
function encryptIp(ip) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VISITOR_IP_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(ip, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.');
}
function decryptIp(value) {
  try {
    const [ivText, tagText, dataText] = String(value).split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', VISITOR_IP_KEY, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataText, 'base64url')), decipher.final()]).toString('utf8');
  } catch { return 'Unavailable'; }
}
function normalizeIp(value) {
  let ip = String(value || '').trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip.startsWith('[') && ip.includes(']')) ip = ip.slice(1, ip.indexOf(']'));
  return net.isIP(ip) ? ip : '';
}
function isPublicIp(ip) {
  if (!ip) return false;
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224);
  }
  const lower = ip.toLowerCase();
  return lower !== '::1' && !lower.startsWith('fc') && !lower.startsWith('fd') && !lower.startsWith('fe80:');
}
function parseDevice(uaValue) {
  const ua = String(uaValue || '');
  const device_type = /ipad|tablet|kindle|silk/i.test(ua) ? 'Tablet' : /mobile|iphone|ipod|android/i.test(ua) ? 'Mobile' : 'Desktop';
  const os = /windows nt/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /(iphone|ipad|ipod)/i.test(ua) ? 'iOS' : /mac os x|macintosh/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Unknown';
  const browser = /edg\//i.test(ua) ? 'Edge' : /opr\//i.test(ua) ? 'Opera' : /firefox\//i.test(ua) ? 'Firefox' : /chrome\//i.test(ua) ? 'Chrome' : /safari\//i.test(ua) ? 'Safari' : 'Unknown';
  return { device_type, os, browser };
}
async function lookupIpLocation(ip) {
  if (!isPublicIp(ip)) return {};
  try {
    // The free ipdata endpoint is used only after the visitor opts in. Its free tier
    // currently allows 1,000 city-level lookups/day and requires attribution.
    const response = await fetch(`https://ipdata.free/${encodeURIComponent(ip)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(3500)
    });
    if (!response.ok) return {};
    const data = await response.json();
    return {
      city: typeof data.city === 'string' ? data.city.slice(0, 100) : '',
      region: typeof data.region === 'string' ? data.region.slice(0, 100) : '',
      country: typeof (data.country_name || data.country) === 'string' ? String(data.country_name || data.country).slice(0, 100) : '',
      country_code: typeof data.country_code === 'string' ? data.country_code.slice(0, 4) : ''
    };
  } catch (error) {
    console.warn('Visitor geolocation unavailable:', error.message);
    return {};
  }
}
function safePagePath(value) {
  try {
    const url = new URL(String(value || '/'), 'https://ktours.invalid');
    return url.pathname.slice(0, 160) || '/';
  } catch { return '/'; }
}
function safeReferrerHost(value) {
  try { return new URL(String(value)).hostname.slice(0, 160); } catch { return ''; }
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      country VARCHAR(80) NOT NULL DEFAULT '',
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      message VARCHAR(1200) NOT NULL,
      photo_files TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS reviews_public_created_idx ON reviews (approved, created_at DESC);

    CREATE TABLE IF NOT EXISTS gallery (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(100) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'Guest moments',
      filename TEXT NOT NULL UNIQUE,
      visible BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS gallery_public_order_idx ON gallery (visible, sort_order, created_at DESC);

    CREATE TABLE IF NOT EXISTS review_photos (
      id BIGSERIAL PRIMARY KEY,
      review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      mime_type VARCHAR(40) NOT NULL,
      image_data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS review_photos_review_idx ON review_photos (review_id);

    CREATE TABLE IF NOT EXISTS gallery_assets (
      id BIGSERIAL PRIMARY KEY,
      gallery_id BIGINT NOT NULL UNIQUE REFERENCES gallery(id) ON DELETE CASCADE,
      mime_type VARCHAR(40) NOT NULL,
      image_data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS visitor_logs (
      id BIGSERIAL PRIMARY KEY,
      ip_encrypted TEXT NOT NULL,
      city VARCHAR(100) NOT NULL DEFAULT '',
      region VARCHAR(100) NOT NULL DEFAULT '',
      country VARCHAR(100) NOT NULL DEFAULT '',
      country_code VARCHAR(4) NOT NULL DEFAULT '',
      device_type VARCHAR(20) NOT NULL DEFAULT 'Unknown',
      device_os VARCHAR(40) NOT NULL DEFAULT 'Unknown',
      browser VARCHAR(40) NOT NULL DEFAULT 'Unknown',
      page_path VARCHAR(160) NOT NULL DEFAULT '/',
      referrer_host VARCHAR(160) NOT NULL DEFAULT '',
      consent_version VARCHAR(40) NOT NULL,
      visitor_token_hash VARCHAR(64) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS visitor_logs_created_idx ON visitor_logs (created_at DESC);
    ALTER TABLE visitor_logs ADD COLUMN IF NOT EXISTS visitor_token_hash VARCHAR(64) NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS visitor_logs_token_idx ON visitor_logs (visitor_token_hash);
  `);
  await pool.query(`DELETE FROM visitor_logs WHERE created_at < NOW() - INTERVAL '${VISITOR_RETENTION_DAYS} days'`);
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected', visitorBook: VISITOR_BOOK_ENABLED, imageStorage: 'postgresql' });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/public/reviews', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.name, r.country, r.rating, r.message, r.created_at,
        ARRAY(SELECT rp.id FROM review_photos rp WHERE rp.review_id = r.id ORDER BY rp.id) AS photo_ids
      FROM reviews r WHERE r.approved = TRUE ORDER BY r.created_at DESC LIMIT 8
    `);
    res.json({ reviews: rows.map(publicReview) });
  } catch (error) { next(error); }
});

app.get('/api/public/gallery', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT g.id, g.title, g.category, g.created_at
      FROM gallery g INNER JOIN gallery_assets ga ON ga.gallery_id = g.id
      WHERE g.visible = TRUE ORDER BY g.sort_order ASC, g.created_at DESC LIMIT 12
    `);
    res.json({ gallery: rows.map(publicGallery) });
  } catch (error) { next(error); }
});

app.post('/api/public/reviews', reviewLimiter, uploader.array('photos', 2), async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const name = String(req.body.name || '').trim();
    const country = String(req.body.country || '').trim();
    const rating = Number(req.body.rating);
    const message = String(req.body.message || '').trim();
    if (!name || name.length > 80) throw Object.assign(new Error('Please enter a name up to 80 characters.'), { status: 400 });
    if (country.length > 80) throw Object.assign(new Error('Country must be 80 characters or fewer.'), { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw Object.assign(new Error('Please choose a rating from 1 to 5.'), { status: 400 });
    if (!message || message.length > 1200) throw Object.assign(new Error('Please enter a review up to 1200 characters.'), { status: 400 });
    for (const file of req.files || []) validateImageBuffer(file);

    await client.query('BEGIN');
    await ensureImageCapacity(client, req.files || []);
    const { rows } = await client.query(
      'INSERT INTO reviews (name, country, rating, message, photo_files, approved) VALUES ($1, $2, $3, $4, ARRAY[]::TEXT[], FALSE) RETURNING id',
      [name, country, rating, message]
    );
    for (const file of req.files || []) {
      await client.query('INSERT INTO review_photos (review_id, mime_type, image_data) VALUES ($1, $2, $3)', [rows[0].id, file.mimetype, file.buffer]);
    }
    await client.query('COMMIT');
    res.status(201).json({ ok: true, id: rows[0].id, message: 'Your review has been submitted for approval.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

// Visitor logging is opt-in. If the visitor declines, no row is written to this guestbook.
app.post('/api/public/visit', visitorLimiter, async (req, res, next) => {
  if (!VISITOR_BOOK_ENABLED) return res.status(404).json({ error: 'Visitor book is disabled.' });
  if (req.body?.consent !== true || req.body?.consentVersion !== CONSENT_VERSION) {
    return res.status(400).json({ error: 'Visitor consent is required.' });
  }
  try {
    const visitorId = String(req.body.visitorId || '');
    if (!/^[a-f0-9-]{36}$/i.test(visitorId)) return res.status(400).json({ error: 'Invalid visitor consent reference.' });
    const ip = normalizeIp(req.ip);
    if (!ip) return res.status(202).json({ ok: true, logged: false });
    const geo = await lookupIpLocation(ip);
    const device = parseDevice(req.get('user-agent'));
    await pool.query(`
      INSERT INTO visitor_logs
        (ip_encrypted, city, region, country, country_code, device_type, device_os, browser, page_path, referrer_host, consent_version, visitor_token_hash)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [
      encryptIp(ip), geo.city || '', geo.region || '', geo.country || '', geo.country_code || '',
      device.device_type, device.os, device.browser, safePagePath(req.body.page),
      safeReferrerHost(req.get('referer') || req.body.referrer), CONSENT_VERSION,
      crypto.createHash('sha256').update(String(req.body.visitorId || '')).digest('hex')
    ]);
    // Enforce the 30-day retention period periodically without requiring a paid cron service.
    if (Math.random() < 0.05) pool.query(`DELETE FROM visitor_logs WHERE created_at < NOW() - INTERVAL '${VISITOR_RETENTION_DAYS} days'`).catch(() => {});
    res.status(202).json({ ok: true, logged: true });
  } catch (error) { next(error); }
});

app.delete('/api/public/visit', visitorLimiter, async (req, res, next) => {
  try {
    const visitorId = String(req.body?.visitorId || '');
    if (!/^[a-f0-9-]{36}$/i.test(visitorId)) return res.status(400).json({ error: 'Invalid visitor consent reference.' });
    const tokenHash = crypto.createHash('sha256').update(visitorId).digest('hex');
    const result = await pool.query('DELETE FROM visitor_logs WHERE visitor_token_hash = $1', [tokenHash]);
    res.json({ ok: true, deleted: result.rowCount });
  } catch (error) { next(error); }
});

app.get('/media/gallery/:id', async (req, res, next) => {
  try {
    if (!/^\d{1,12}$/.test(req.params.id)) return res.sendStatus(404);
    const { rows } = await pool.query(`
      SELECT ga.image_data, ga.mime_type FROM gallery_assets ga
      INNER JOIN gallery g ON g.id = ga.gallery_id
      WHERE g.id = $1 AND g.visible = TRUE
    `, [req.params.id]);
    if (!rows.length) return res.sendStatus(404);
    res.set({ 'Content-Type': rows[0].mime_type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    res.send(rows[0].image_data);
  } catch (error) { next(error); }
});

app.get('/media/review-photo/:id', async (req, res, next) => {
  try {
    if (!/^\d{1,12}$/.test(req.params.id)) return res.sendStatus(404);
    const { rows } = await pool.query(`
      SELECT rp.image_data, rp.mime_type FROM review_photos rp
      INNER JOIN reviews r ON r.id = rp.review_id
      WHERE rp.id = $1 AND r.approved = TRUE
    `, [req.params.id]);
    if (!rows.length) return res.sendStatus(404);
    res.set({ 'Content-Type': rows[0].mime_type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    res.send(rows[0].image_data);
  } catch (error) { next(error); }
});

app.post('/api/admin/login', loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (!timingSafeStringEqual(username.toLowerCase(), ADMIN_USERNAME.toLowerCase()) || !timingSafeStringEqual(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.isAdmin = true;
      req.session.adminUsername = ADMIN_USERNAME;
      req.session.save(saveError => {
        if (saveError) return next(saveError);
        res.json({ ok: true, username: ADMIN_USERNAME });
      });
    });
  } catch (error) { next(error); }
});

app.get('/api/admin/session', (req, res) => {
  if (req.session?.isAdmin === true) return res.json({ authenticated: true, username: req.session.adminUsername });
  res.status(401).json({ authenticated: false });
});

app.post('/api/admin/logout', requireAdmin, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('ktours.admin.sid', { httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'strict' });
    res.json({ ok: true });
  });
});

app.get('/api/admin/reviews', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.name, r.country, r.rating, r.message, r.approved, r.created_at,
        ARRAY(SELECT rp.id FROM review_photos rp WHERE rp.review_id = r.id ORDER BY rp.id) AS photo_ids
      FROM reviews r WHERE r.approved = FALSE ORDER BY r.created_at DESC
    `);
    res.json({ reviews: rows.map(row => ({ ...publicReview(row), photo_urls: (row.photo_ids || []).map(id => `/api/admin/review-photo/${encodeURIComponent(id)}`) })) });
  } catch (error) { next(error); }
});

app.get('/api/admin/review-photo/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!/^\d{1,12}$/.test(req.params.id)) return res.sendStatus(404);
    const { rows } = await pool.query('SELECT image_data, mime_type FROM review_photos WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.sendStatus(404);
    res.set({ 'Content-Type': rows[0].mime_type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.send(rows[0].image_data);
  } catch (error) { next(error); }
});

app.post('/api/admin/reviews/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('UPDATE reviews SET approved = TRUE WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Review not found.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Review not found.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/admin/gallery', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT g.id, g.title, g.category, g.visible, g.sort_order, g.created_at
      FROM gallery g INNER JOIN gallery_assets ga ON ga.gallery_id = g.id
      ORDER BY g.sort_order ASC, g.created_at DESC
    `);
    res.json({ gallery: rows.map(publicGallery) });
  } catch (error) { next(error); }
});

app.post('/api/admin/gallery', requireAdmin, uploader.single('photo'), async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || 'Guest moments').trim();
    if (!req.file) throw Object.assign(new Error('Choose a photo to upload.'), { status: 400 });
    validateImageBuffer(req.file);
    if (!title || title.length > 100) throw Object.assign(new Error('Photo title must be between 1 and 100 characters.'), { status: 400 });
    if (category.length > 80) throw Object.assign(new Error('Category must be 80 characters or fewer.'), { status: 400 });
    await client.query('BEGIN');
    await ensureImageCapacity(client, [req.file]);
    const { rows: countRows } = await client.query('SELECT COUNT(*)::int AS total FROM gallery');
    const placeholderFilename = `db-image-${crypto.randomUUID()}`;
    const { rows } = await client.query(
      'INSERT INTO gallery (title, category, filename, visible, sort_order) VALUES ($1, $2, $3, TRUE, $4) RETURNING id',
      [title, category, placeholderFilename, countRows[0].total]
    );
    await client.query('INSERT INTO gallery_assets (gallery_id, mime_type, image_data) VALUES ($1, $2, $3)', [rows[0].id, req.file.mimetype, req.file.buffer]);
    await client.query('COMMIT');
    res.status(201).json({ ok: true, id: rows[0].id, image_url: `/media/gallery/${encodeURIComponent(rows[0].id)}` });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

app.delete('/api/admin/gallery/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Photo not found.' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/admin/visitors', requireAdmin, async (req, res, next) => {
  if (!VISITOR_BOOK_ENABLED) return res.json({ enabled: false, visitors: [], total: 0, today: 0 });
  try {
    await pool.query(`DELETE FROM visitor_logs WHERE created_at < NOW() - INTERVAL '${VISITOR_RETENTION_DAYS} days'`);
    const [{ rows }, counts] = await Promise.all([
      pool.query(`SELECT id, ip_encrypted, city, region, country, country_code, device_type, device_os, browser, page_path, referrer_host, created_at FROM visitor_logs ORDER BY created_at DESC LIMIT 150`),
      pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= ((NOW() AT TIME ZONE 'Africa/Cairo')::date::timestamp AT TIME ZONE 'Africa/Cairo'))::int AS today FROM visitor_logs`)
    ]);
    res.json({
      enabled: true,
      visitors: rows.map(row => ({ ...row, ip: decryptIp(row.ip_encrypted), ip_encrypted: undefined })),
      total: counts.rows[0].total,
      today: counts.rows[0].today,
      retention_days: VISITOR_RETENTION_DAYS
    });
  } catch (error) { next(error); }
});

app.delete('/api/admin/visitors', requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM visitor_logs');
    res.json({ ok: true, deleted: result.rowCount });
  } catch (error) { next(error); }
});

app.use(express.static(PUBLIC_DIR, {
  dotfiles: 'deny',
  index: 'index.html',
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    else res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
  res.status(404).send('Page not found.');
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be 1.5 MB or smaller.' : error.code === 'LIMIT_FILE_COUNT' ? 'Up to 2 review photos are allowed.' : 'Invalid upload.';
    return res.status(400).json({ error: message });
  }
  const status = Number(error.status) || 500;
  if (status >= 500) console.error('Request failed:', error.message);
  const safeMessage = status >= 500 && status !== 507 ? 'A server error occurred. Please try again later.' : error.message;
  res.status(status).json({ error: safeMessage });
});

(async () => {
  await ensureSchema();
  app.listen(PORT, '0.0.0.0', () => console.log(`K-tours server listening on ${PORT}; PostgreSQL connected; visitor book ${VISITOR_BOOK_ENABLED ? 'enabled' : 'disabled'}.`));
})().catch(error => {
  console.error('K-tours startup failed:', error.message);
  process.exit(1);
});

async function shutdown() {
  console.log('Shutting down K-tours…');
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
