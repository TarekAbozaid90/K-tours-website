'use strict';

const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 10000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(ROOT, 'data', 'uploads'));
const REVIEW_DIR = path.join(UPLOAD_ROOT, 'reviews');
const GALLERY_DIR = path.join(UPLOAD_ROOT, 'gallery');
const TEMP_DIR = path.join(UPLOAD_ROOT, 'tmp');
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');
const SESSION_SECRET_BASE = String(process.env.SESSION_SECRET || '');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Connect a Render Postgres database.');
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) throw new Error('Set ADMIN_PASSWORD in Render Environment (at least 10 characters).');
if (NODE_ENV === 'production' && SESSION_SECRET_BASE.length < 32) throw new Error('Set a long random SESSION_SECRET in Render Environment.');
// Deriving the cookie signing key from the credentials invalidates prior sessions
// automatically whenever the admin username or password is changed.
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
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '30kb' }));
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
  if (!origin) return next(); // Non-browser local tools may omit Origin.
  try {
    if (new URL(origin).host !== req.get('host')) {
      return res.status(403).json({ error: 'Request origin is not allowed.' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid request origin.' });
  }
  next();
}
app.use('/api', checkSameOrigin);

const allowedMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const extension = allowedMime.get(file.mimetype);
    if (!extension) return cb(new Error('Only JPG, PNG and WebP images are accepted.'));
    cb(null, `${crypto.randomUUID()}${extension}`);
  }
});
const uploader = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 3, fields: 8, fieldSize: 10_000 },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) return cb(new Error('Only JPG, PNG and WebP images are accepted.'));
    cb(null, true);
  }
});

async function ensureSchema() {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  await fs.mkdir(GALLERY_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
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
  `);
}

function validStoredFilename(filename) {
  return typeof filename === 'string' && /^[a-f0-9-]{36}\.(jpg|png|webp)$/i.test(filename);
}

async function moveUploadedFiles(files, destination) {
  const saved = [];
  for (const file of files || []) {
    const target = path.join(destination, path.basename(file.filename));
    await fs.rename(file.path, target);
    saved.push(file.filename);
  }
  return saved;
}

async function removeFiles(directory, filenames) {
  await Promise.all((filenames || []).map(async filename => {
    if (!validStoredFilename(filename)) return;
    try { await fs.unlink(path.join(directory, filename)); } catch (error) {
      if (error.code !== 'ENOENT') console.warn('Could not remove uploaded file:', error.message);
    }
  }));
}

function publicReview(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    rating: row.rating,
    message: row.message,
    created_at: row.created_at,
    photo_urls: (row.photo_files || []).map(filename => `/media/reviews/${encodeURIComponent(filename)}`)
  };
}
function publicGallery(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    created_at: row.created_at,
    image_url: `/media/gallery/${encodeURIComponent(row.filename)}`
  };
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/public/reviews', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, country, rating, message, photo_files, created_at FROM reviews WHERE approved = TRUE ORDER BY created_at DESC LIMIT 8'
    );
    res.json({ reviews: rows.map(publicReview) });
  } catch (error) { next(error); }
});

app.get('/api/public/gallery', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, category, filename, created_at FROM gallery WHERE visible = TRUE ORDER BY sort_order ASC, created_at DESC LIMIT 12'
    );
    res.json({ gallery: rows.map(publicGallery) });
  } catch (error) { next(error); }
});

app.post('/api/public/reviews', reviewLimiter, uploader.array('photos', 3), async (req, res, next) => {
  let savedFiles = [];
  try {
    const name = String(req.body.name || '').trim();
    const country = String(req.body.country || '').trim();
    const rating = Number(req.body.rating);
    const message = String(req.body.message || '').trim();
    if (!name || name.length > 80) throw Object.assign(new Error('Please enter a name up to 80 characters.'), { status: 400 });
    if (country.length > 80) throw Object.assign(new Error('Country must be 80 characters or fewer.'), { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw Object.assign(new Error('Please choose a rating from 1 to 5.'), { status: 400 });
    if (!message || message.length > 1200) throw Object.assign(new Error('Please enter a review up to 1200 characters.'), { status: 400 });
    if ((req.files || []).some(file => file.size > 5 * 1024 * 1024)) throw Object.assign(new Error('Each review photo must be 5 MB or smaller.'), { status: 400 });
    savedFiles = await moveUploadedFiles(req.files, REVIEW_DIR);
    const { rows } = await pool.query(
      'INSERT INTO reviews (name, country, rating, message, photo_files, approved) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING id',
      [name, country, rating, message, savedFiles]
    );
    res.status(201).json({ ok: true, id: rows[0].id, message: 'Your review has been submitted for approval.' });
  } catch (error) {
    await removeFiles(REVIEW_DIR, savedFiles);
    if (req.files) await Promise.all(req.files.filter(f => f.path).map(f => fs.unlink(f.path).catch(() => {})));
    next(error);
  }
});

app.get('/media/gallery/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    if (!validStoredFilename(filename)) return res.sendStatus(404);
    const { rowCount } = await pool.query('SELECT 1 FROM gallery WHERE filename = $1 AND visible = TRUE', [filename]);
    if (!rowCount) return res.sendStatus(404);
    res.sendFile(path.join(GALLERY_DIR, filename), { dotfiles: 'deny' }, error => { if (error && !res.headersSent) next(error); });
  } catch (error) { next(error); }
});

app.get('/media/reviews/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    if (!validStoredFilename(filename)) return res.sendStatus(404);
    const { rowCount } = await pool.query('SELECT 1 FROM reviews WHERE approved = TRUE AND $1 = ANY(photo_files)', [filename]);
    if (!rowCount) return res.sendStatus(404);
    res.sendFile(path.join(REVIEW_DIR, filename), { dotfiles: 'deny' }, error => { if (error && !res.headersSent) next(error); });
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
    const { rows } = await pool.query(
      'SELECT id, name, country, rating, message, photo_files, approved, created_at FROM reviews WHERE approved = FALSE ORDER BY created_at DESC'
    );
    res.json({ reviews: rows.map(row => ({ ...publicReview(row), photo_urls: (row.photo_files || []).map(filename => `/api/admin/review-photos/${encodeURIComponent(filename)}`) })) });
  } catch (error) { next(error); }
});

app.get('/api/admin/review-photos/:filename', requireAdmin, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    if (!validStoredFilename(filename)) return res.sendStatus(404);
    const { rowCount } = await pool.query('SELECT 1 FROM reviews WHERE $1 = ANY(photo_files)', [filename]);
    if (!rowCount) return res.sendStatus(404);
    res.sendFile(path.join(REVIEW_DIR, filename), { dotfiles: 'deny' }, error => { if (error && !res.headersSent) next(error); });
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
    const { rows } = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING photo_files', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Review not found.' });
    await removeFiles(REVIEW_DIR, rows[0].photo_files);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/admin/gallery', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, title, category, filename, visible, sort_order, created_at FROM gallery ORDER BY sort_order ASC, created_at DESC');
    res.json({ gallery: rows.map(publicGallery) });
  } catch (error) { next(error); }
});

app.post('/api/admin/gallery', requireAdmin, uploader.single('photo'), async (req, res, next) => {
  let filename = null;
  try {
    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || 'Guest moments').trim();
    if (!req.file) throw Object.assign(new Error('Choose a photo to upload.'), { status: 400 });
    if (!title || title.length > 100) throw Object.assign(new Error('Photo title must be between 1 and 100 characters.'), { status: 400 });
    if (category.length > 80) throw Object.assign(new Error('Category must be 80 characters or fewer.'), { status: 400 });
    [filename] = await moveUploadedFiles([req.file], GALLERY_DIR);
    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS total FROM gallery');
    const { rows } = await pool.query(
      'INSERT INTO gallery (title, category, filename, visible, sort_order) VALUES ($1, $2, $3, TRUE, $4) RETURNING id',
      [title, category, filename, countRows[0].total]
    );
    res.status(201).json({ ok: true, id: rows[0].id, image_url: `/media/gallery/${encodeURIComponent(filename)}` });
  } catch (error) {
    if (filename) await removeFiles(GALLERY_DIR, [filename]);
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    next(error);
  }
});

app.delete('/api/admin/gallery/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM gallery WHERE id = $1 RETURNING filename', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Photo not found.' });
    await removeFiles(GALLERY_DIR, [rows[0].filename]);
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.use(express.static(PUBLIC_DIR, {
  dotfiles: 'deny',
  index: 'index.html',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
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
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Image is too large.' : error.code === 'LIMIT_FILE_COUNT' ? 'Too many photos selected.' : 'Invalid upload.';
    return res.status(400).json({ error: message });
  }
  const status = Number(error.status) || 500;
  if (status >= 500) console.error('Request failed:', error.message);
  res.status(status).json({ error: status >= 500 ? 'A server error occurred. Please try again later.' : error.message });
});

(async () => {
  await ensureSchema();
  app.listen(PORT, '0.0.0.0', () => console.log(`K-tours server listening on ${PORT}; database connected.`));
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
