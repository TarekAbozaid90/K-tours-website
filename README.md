# K-tours — Free Starter Edition

K-tours is a bilingual English / Egyptian Arabic tourism website with a private admin dashboard, customer reviews, a photo gallery, an opt-in visitor book and click-to-enlarge image details. This edition uses **Render Free Web Service + Neon Free PostgreSQL**. It does not use Supabase or a paid Render disk/database.

## Architecture

- **Render Free Web Service (Node.js / Express):** hosts the public website, admin dashboard and protected APIs. It sleeps after 15 minutes without traffic and may take about a minute to wake up.
- **Neon Free PostgreSQL:** stores reviews, image bytes, gallery records, visitor-book entries and admin sessions. Neon is a separate provider (not hosted inside Render), selected because Render's free Postgres expires after 30 days.
- **Database image storage:** uploaded review/gallery images are stored as PostgreSQL `BYTEA` data. Each photo is limited to 3 MB; a review may include up to two photos; stored uploaded image bytes are capped at about 650 MB to leave database headroom. This avoids a Render Persistent Disk and keeps uploaded images after a Render restart/redeploy.
- **GitHub:** stores source code and triggers Render deployment.
- **IP geolocation:** after a visitor explicitly opts in, the server reads the client IP forwarded by Render/Cloudflare and asks `country.is`, `ipwho.is` and `ipapi.co` for approximate country and, when available, city/region. The IP is encrypted in the database; both providers are named in the privacy page.

### Admin improvements – 23 November 2026

- Added Statistics dashboard for traffic, reviews and gallery data.
- Migrated the original five homepage gallery tiles into the database-managed gallery, including English/Arabic titles.
- Added edit, show/hide, replace-image, reorder and delete controls for all gallery items.
- Improved visitor IP extraction using Render/Cloudflare forwarded headers and added a fallback geolocation provider; missing country lookups are retried in limited batches.

### 23 November 2026 maintenance update

- Visitor-book consent versions are synchronized between the browser and server (`2026-11-23-v5`); the browser asks for consent again because the geolocation notice now names a fallback provider.
- IP country lookup uses `country.is`, with `ipwho.is` and `ipapi.co` as fallbacks for country/city/region, only after opt-in, with an in-memory cache. Missing country values in older rows can be retried in small batches from the admin Visitor Book.
- Customer review and admin gallery uploads accept JPG/PNG/WebP images up to 3 MB per file. Reviews still allow at most two photos.

## Project structure

- `public/index.html`, `public/styles.css`, `public/app.js` — bilingual public site, lighter forest-green/gold theme, image lightbox, review form and privacy choice banner.
- `public/admin.html`, `public/admin.css`, `public/admin.js` — admin login, statistics, review moderation, full gallery management and visitor book.
- `public/privacy.html` — bilingual visitor-data privacy notice and consent explanation.
- `server.js` — API, admin authentication, visitor logging, IP encryption, image uploads and PostgreSQL access.
- `render.yaml` — Render Free Web Service Blueprint; database URL is supplied manually from Neon.
- `.env.example` — local environment variable template.
- `public/config.js` — public WhatsApp number only. No secrets belong here.
- `public/assets/` — logo and supplied group photograph.
- `public/photo-credits.html` — third-party photo credits.
- `docs/NEON-RENDER-FREE-SETUP.md` — detailed setup guide (Arabic).

## Deploy for free

### 1) Create the Neon database

1. Open <https://console.neon.tech/> and create a project on the Free plan.
2. Select a nearby supported region; Frankfurt / `eu-central-1` is a good match for the Render Frankfurt service.
3. Open **Connect** and copy the **pooled** PostgreSQL connection string (the hostname usually contains `-pooler`). Keep `sslmode=require` in the URL.
4. Do not commit this string to GitHub or put it in a public JavaScript file.

Current Free plan documentation lists 1 GB storage, 100 compute-hours per project each month, 5 GB public network transfer per project each month, and compute scale-to-zero after five minutes idle. These limits can change; check Neon before deploying.

### 2) Push this project to GitHub

1. Extract the ZIP.
2. Upload the **contents** of the `k-tours-site` folder to the root of a new GitHub repository. `render.yaml`, `package.json` and `server.js` must be in the repository root; public files stay under `public/`.
3. Keep `.env` and all database secrets out of GitHub. `.gitignore` already excludes `.env`.

### 3) Create the Render Web Service

1. Open <https://dashboard.render.com/>.
2. Choose **New + → Blueprint** and connect the new GitHub repository.
3. Render reads `render.yaml` and creates one **Free** Node Web Service named `k-tours-fullstack`. It does not create a Render database or persistent disk.
4. When prompted, enter these secret environment values:
   - `DATABASE_URL`: Neon pooled connection string.
   - `ADMIN_USERNAME`: for example `admin`.
   - `ADMIN_PASSWORD`: a unique password of at least 12 characters.
5. `SESSION_SECRET` and `VISITOR_IP_ENCRYPTION_KEY` are generated by Render. Keep them private and do not regenerate unless you understand the impact: changing the IP encryption secret means older encrypted visitor IPs will no longer be readable.
6. Complete deployment. Render runs `npm install --omit=dev` and `npm start`.

### 4) Check the service

Open `https://YOUR-SERVICE.onrender.com/api/health`. Expected shape:

```json
{
  "ok": true,
  "database": "connected",
  "visitorBook": true,
  "imageStorage": "postgresql"
}
```

The app creates the review, gallery, image, visitor-log and session tables automatically on its first successful start. Then test `/admin.html`, submit a review, approve it, upload a gallery photo and confirm that both image types persist after a redeploy.

## Admin settings

- Admin username/password are server-side Render Environment variables. Do not edit `admin.js` or `config.js` to change them.
- To change credentials: Render → `k-tours-fullstack` → **Environment**, edit `ADMIN_USERNAME` and/or `ADMIN_PASSWORD`, then save/redeploy. Existing sessions are invalidated when credentials change.
- The admin dashboard contains **Statistics**, **Guest reviews**, **Photo gallery** and **Visitor book** tabs. Statistics include review totals and average rating, active gallery items, recorded visits, top visitor countries and device categories, seven-day traffic, unique consented browsers, popular pages, referrers and browser distribution. The gallery tab manages the original starter photos and new uploads: edit English/Arabic titles and category, hide/show, replace image, reorder and delete.
- The visitor table is limited to the last 30 days and includes visit time, IP, approximate city/region/country, device type, browser/OS, page and referring host. On Render, the app reads the client address from `CF-Connecting-IP` when available, then the first `X-Forwarded-For` entry, before falling back to Express's proxy-resolved address. Missing country names and codes are retried from the admin view at a limited rate. A country code is converted to a readable country name where possible. You can refresh or clear the log from the dashboard.

## Visitor privacy and geolocation

- Visitor logging is **opt-in**. Visitors see an Arabic/English notice and can choose Allow or No thanks. Declining does not block the website.
- Only visitors who accepted are entered into the K-tours visitor table; the same browser is recorded no more than once every 24 hours. The browser can open **Privacy choices** in the footer to withdraw consent; the site attempts to delete prior rows associated with that browser reference.
- Full IP addresses are encrypted at rest using AES-256-GCM and decrypted only for the authenticated admin visitor-book view.
- City/country are inferred from IP and are approximate, not GPS coordinates. VPNs, mobile carriers and corporate gateways may make them inaccurate.
- On opt-in only, the server may send the visitor IP to `api.country.is`, `ipwho.is` and/or `ipapi.co` for country and, when available, city/region estimation. All three providers are named in the privacy notice. Providers can rate-limit requests, so location remains approximate and may be unavailable.
- Visitor-log rows are automatically deleted after 30 days. Review submissions have their own moderation consent and remain private until approved.
- Egypt's Personal Data Protection Law and its Executive Regulations may apply to this processing. The public privacy notice is a technical transparency starting point, not legal advice or a claim of regulatory compliance. Have an Egyptian privacy professional review lawful basis, licensing/permit and cross-border processing requirements before public launch.

## Free-plan limits and trade-offs

- Render Free Web Services sleep after 15 minutes idle and may need about a minute to wake. They have an ephemeral filesystem; this project does not depend on it for uploaded images or database records.
- Render Free Postgres is intentionally **not** used: it expires 30 days after creation.
- Neon Free is external to Render but offers a persistent free Postgres database within its current quota. The project will need a paid Neon tier or cleanup/backup strategy if storage, compute-hours or network use exceeds the free allowance.
- Images are stored inside Neon as binary data. Keep photos compressed and small; uploaded photos are limited to 3 MB each, and the application caps the total uploaded image bytes at about 650 MB to leave headroom in Neon Free's 1 GB database quota shared with reviews, sessions and visitor records.
- This is a small portfolio/review setup, not a high-availability production architecture. Export backups regularly from Neon.

## Existing data migration

The new Neon database starts with an empty schema. Existing reviews/photos from Supabase or a previous Render PostgreSQL database are **not automatically migrated**. Export any records you need before retiring the old database. Existing on-disk uploaded photos from a Free Render filesystem cannot be relied on after a restart/redeploy.

## Local development

1. Create a Neon project or local PostgreSQL database.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill `DATABASE_URL`, `ADMIN_PASSWORD` and `SESSION_SECRET`. For local development, you may use a long local-only `VISITOR_IP_ENCRYPTION_KEY`.
4. Run `npm run dev`, then open `http://localhost:10000/`.

## Security notes

- The database URL, admin password, session secret and visitor IP-encryption secret are server-side only. Never put them in `public/config.js` or commit them.
- Admin cookie is HttpOnly, Secure in production and SameSite Strict. Login attempts and review/visitor submissions are rate-limited.
- Public image delivery is limited to visible gallery assets and approved review photos. Pending review images are only accessible after admin authentication.
- Image type is checked against the file signature; uploads are limited to JPEG/PNG/WebP and 3 MB each.
- The visitor dashboard is protected by the admin session. Do not share admin credentials.

## Launch checklist

- [ ] Render Blueprint has one Free Web Service; no Render Postgres / paid disk resource was created.
- [ ] Neon pooled `DATABASE_URL` is stored in Render Environment.
- [ ] `/api/health` returns `database: connected`.
- [ ] Admin can log in with Render Environment credentials.
- [ ] Submit a review and verify it stays hidden until approval.
- [ ] Upload one small gallery photo and check it appears on the website.
- [ ] Click the hero background, any destination/gallery/review photo and an admin thumbnail; test the enlarged image/details view and next/previous controls.
- [ ] In a private browser, accept the visitor notice and verify one entry appears in Visitor book with device and approximate IP location.
- [ ] In another browser, decline the notice and verify no visitor entry is created.
- [ ] Open Privacy choices and withdraw consent; verify related rows are deleted.
- [ ] Keep a backup/export of the Neon database.

## Official references

- Render free service limitations: <https://render.com/docs/free>
- Neon Free quotas: <https://neon.com/docs/introduction/plans>
- IP geolocation APIs: <https://country.is/>, <https://ipwhois.io/documentation>, <https://ipapi.co/api/>
- Egyptian PDPC consent guidelines: <https://pdpc.gov.eg/assets/pdf-data/Guidelines/DSConsent.pdf>
- Egyptian Personal Data Protection Law 151/2020 (Official Gazette): <https://escc.gov.eg/assets/docs/law-151-2020.pdf>
