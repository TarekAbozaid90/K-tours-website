# K-tours — Mohamed Kataif

K-tours is a bilingual English / Egyptian Arabic tourism website with a private admin dashboard. This edition uses **Render Web Service + Render Managed PostgreSQL**. It does not use Supabase, Firebase, or an external database.

## Architecture

- **Render Web Service (Node.js / Express):** serves the public website, admin dashboard, and protected API routes.
- **Render PostgreSQL:** stores guest reviews, gallery records, and admin sessions. The database is configured for internal-only access (`ipAllowList: []`) and is connected using Render's internal `DATABASE_URL`.
- **Render Persistent Disk:** stores uploaded guest and gallery photographs at `/var/data/uploads`. This is required because Render's default service filesystem is ephemeral.
- **GitHub:** stores the source code and triggers deployments to Render.

The web service and database are both placed in the Frankfurt region. The Blueprint provisions a separate new service named `k-tours-fullstack` and a database named `k-tours-db`; it does not convert or delete the previous static site.

## Project structure

- `public/index.html`, `public/styles.css`, `public/app.js` — bilingual public site.
- `public/admin.html`, `public/admin.css`, `public/admin.js` — password-protected moderation and gallery dashboard.
- `server.js` — API, authentication, upload handling, and PostgreSQL access.
- `package.json` — Node dependencies and start command.
- `render.yaml` — Render Blueprint for the Web Service, private Postgres database connection, and persistent upload disk.
- `public/config.js` — public WhatsApp number only. No secrets belong here.
- `public/assets/` — logo and supplied tour photograph.
- `public/photo-credits.html` — photo credits for third-party landmark photos.
- `docs/RENDER-POSTGRES-SETUP.md` — Arabic deployment / configuration guide.

## Deploy with Render Blueprint (recommended)

1. Before pushing to the repository currently linked to the old static site, temporarily disable Auto-Deploy on that old Render Static Site. Do not delete it yet.
2. Extract the ZIP. Upload the **contents** of the `k-tours-site` folder to the root of a new GitHub repository (or the existing one after disabling auto-deploy). Keep `render.yaml` and `package.json` at the repository root; the public web files live inside `public/`.
3. In Render, choose **New + → Blueprint** and connect that repository.
4. Review the resources in `render.yaml`. It creates:
   - Web Service: `k-tours-fullstack` (Node.js, Frankfurt, paid `0.5c-512mb` plan)
   - Managed Postgres: `k-tours-db` (`0.1c-256mb`, Frankfurt, internal-only network access)
   - 1 GB persistent disk mounted at `/var/data` for uploads
5. Complete the Blueprint sync. Render injects the database's **internal** connection string as `DATABASE_URL` automatically. The initial Blueprint flow also prompts for the two `sync: false` secrets.
6. Open the `k-tours-fullstack` Web Service → **Environment** and set (or verify):
   - `ADMIN_USERNAME` — for example, `admin`
   - `ADMIN_PASSWORD` — choose a strong, unique password of at least 10 characters
   - `SESSION_SECRET` — generated automatically by the Blueprint; do not replace it with a short value
7. Save changes and deploy. The startup process creates the `reviews` and `gallery` tables and the PostgreSQL session table automatically.
8. Open the new web service URL. Test `/api/health`; it should return `{ "ok": true, "database": "connected" }`.
9. Open `/admin.html` and sign in using the values you placed in the Render Environment page.
10. After all tests pass, switch your custom domain (if any) to the new service. Keep the previous static Render site and old Supabase project until the new service has been fully tested and any old records/photos have been exported or migrated.

## If creating resources manually

If you do not use the Blueprint, create a Render PostgreSQL database and a Node.js Web Service in the **same region** (Frankfurt is selected in the Blueprint). On the database's Connect page, copy its **Internal Database URL** into the web service's `DATABASE_URL` Environment variable. Restrict the database IP allowlist to internal connections only after confirming the web service is connected. Add a 1 GB Persistent Disk to the Web Service at `/var/data`.

Set these variables in the Web Service Environment:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render Postgres **Internal** URL (never commit this) |
| `UPLOAD_DIR` | `/var/data/uploads` |
| `ADMIN_USERNAME` | Your chosen username |
| `ADMIN_PASSWORD` | Your chosen password; at least 10 characters |
| `SESSION_SECRET` | A generated random value of at least 32 characters |
| `WHATSAPP_NUMBER` | WhatsApp number in international digits, no `+` |

Build command: `npm install --omit=dev`  
Start command: `npm start`  
Health check path: `/api/health`

## Change the admin username or password

1. Open Render Dashboard → `k-tours-fullstack` → **Environment**.
2. Edit `ADMIN_USERNAME` and/or `ADMIN_PASSWORD`.
3. Save and deploy. The server will restart and existing admin sessions will be invalidated.
4. Sign in again at `/admin.html`.

Do not change login credentials in `admin.js` or `config.js`. The server verifies them; they are never sent to the browser. Do not put them in GitHub.

## Local development

A local PostgreSQL database is required. Create a local database, then:

```bash
npm install
cp .env.example .env
# Edit DATABASE_URL, ADMIN_PASSWORD and SESSION_SECRET in .env
npm run dev
```

Open `http://localhost:10000/`. Do not use production credentials in a local `.env` file and never commit `.env`.

## Data and photo handling

- Public visitors can submit reviews; new reviews are private until approved in the admin dashboard.
- Photos attached to pending reviews are not publicly served. After approval, the images become accessible on the public website.
- Admin gallery photographs are uploaded to the Render persistent disk. Their metadata and visibility are stored in PostgreSQL.
- `reviews`, `gallery`, and admin sessions are stored in Render Postgres.
- Existing Supabase records, authentication users, and Storage files are **not automatically copied** by this code update. Export / migrate any existing records before deleting the old project.
- The PostgreSQL database and the upload disk are separate Render resources. Back up both before major changes. A database backup does not contain files stored on the persistent disk.

## Important Render plan limitations and cost notes

The included Blueprint uses paid plans intentionally:
- Render's Free Postgres expires after 30 days, so it is not suitable as the permanent database for this website.
- Persistent disks require a paid Render Web Service. Without the disk, uploaded photo files would be lost after a deploy or restart.
- A persistent disk restricts the web service to a single instance; this is sufficient for the current personal portfolio / guest-review workload.

Review the current Render pricing before syncing the Blueprint. The exact amount depends on your workspace, region, selected plans, storage, and taxes.

## Security notes

- The database's `ipAllowList: []` is set to prevent external database connections. The app uses the internal URL.
- Admin cookies are `HttpOnly`, `Secure` in production, and `SameSite=Strict`.
- Login attempts and review submissions are rate-limited.
- Admin endpoints require a server-side session. Knowing a hidden admin URL does not grant access.
- Never commit `.env`, `DATABASE_URL`, `ADMIN_PASSWORD`, or `SESSION_SECRET`.
- The server validates image types and sizes and uses randomized filenames.

## Launch checks

- [ ] `/api/health` shows that PostgreSQL is connected.
- [ ] Public English / Arabic switch and mobile navigation work.
- [ ] WhatsApp enquiry opens with the correct number.
- [ ] Submit a test review; confirm it does not show publicly before approval.
- [ ] Sign in to `/admin.html`, approve the test review, and confirm it appears publicly.
- [ ] Upload a gallery image, refresh the site, and verify the image persists.
- [ ] Delete the test review / image and verify files are removed.
- [ ] Restart / redeploy the Web Service and verify saved reviews and uploaded photos remain.
- [ ] Keep the old static site / Supabase project until migration and verification are complete.

## Official Render references

- Render Postgres: https://render.com/docs/postgresql-creating-connecting
- Internal vs external database URLs: https://render.com/tutorials/postgres-on-render/connection-strings
- Web Services: https://render.com/docs/web-services
- Persistent Disks: https://render.com/docs/disks
- Free service and database limits: https://render.com/docs/free
- Blueprint YAML: https://render.com/docs/blueprint-spec
