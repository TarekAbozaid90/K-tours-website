# K-tours Admin Login — Render + Neon Free edition

The admin page authenticates against the K-tours Express server. Username and password are stored as **Render Web Service environment variables**, not in public JavaScript or HTML. The admin session table is stored in the Neon PostgreSQL database.

## First setup

1. Open Render Dashboard → `k-tours-fullstack` → **Environment**.
2. Set `ADMIN_USERNAME` to your preferred administrator username (for example `admin`).
3. Set `ADMIN_PASSWORD` to a unique password of at least 12 characters.
4. Set `DATABASE_URL` to the Neon pooled PostgreSQL connection string, including `sslmode=require`.
5. Confirm Render generated `SESSION_SECRET` and `VISITOR_IP_ENCRYPTION_KEY`.
6. Save and deploy, then open `/admin.html`.

## Change the username or password

1. Open Render Dashboard → `k-tours-fullstack` → **Environment**.
2. Change `ADMIN_USERNAME` and/or `ADMIN_PASSWORD`.
3. Click **Save and deploy**.
4. Sign in again. Existing admin sessions are invalidated when credentials change.

Never put these values into `config.js`, `admin.js`, HTML, or GitHub. `DATABASE_URL`, `SESSION_SECRET`, and `VISITOR_IP_ENCRYPTION_KEY` are also secrets and must remain in Render Environment.
