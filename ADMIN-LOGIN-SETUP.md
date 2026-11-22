# K-tours Admin Login — Render PostgreSQL edition

The admin page now authenticates against the K-tours Express server. Username and password are stored as **Render Web Service environment variables**, not in public JavaScript or HTML.

## First setup

1. Open Render Dashboard → `k-tours-fullstack` → **Environment**.
2. Set `ADMIN_USERNAME` to your preferred username (the Blueprint does not expose a default in public code).
3. Set `ADMIN_PASSWORD` to a strong password of at least 10 characters.
4. Confirm `SESSION_SECRET` is generated and `DATABASE_URL` is connected to the Render Postgres internal URL.
5. Save and deploy, then open `/admin.html`.

## Change the username or password

1. Open Render Dashboard → `k-tours-fullstack` → **Environment**.
2. Change `ADMIN_USERNAME` and/or `ADMIN_PASSWORD`.
3. Click **Save and deploy**.
4. Sign in again. Existing admin sessions are invalidated when the server restarts.

Never put these values into `config.js`, `admin.js`, HTML, or GitHub. `DATABASE_URL` and `SESSION_SECRET` are also secrets and must remain in Render Environment.
