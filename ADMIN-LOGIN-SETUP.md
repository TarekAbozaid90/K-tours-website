# K-tours admin login: username + password

The admin page now uses Supabase password authentication. The username is mapped to the administrator email configured in `config.js`; Supabase checks the password. The password is deliberately **not** written in HTML, JavaScript, `config.js`, or GitHub.

## First-time setup

1. Open the Supabase project used by K-tours.
2. Go to **Authentication → Users** and confirm that the administrator account `mkataif@gmail.com` exists. The previous magic-link account can be reused. If it does not exist, create/invite that user from the Supabase Dashboard first.
3. Go to **Authentication → URL Configuration → Redirect URLs** and add the exact admin page URL, for example `https://YOUR-SITE.onrender.com/admin.html`. For local testing, also add `http://localhost:4173/admin.html`.
4. Open the live `/admin.html` page and click **Set password for first use / Forgot password?**.
5. Open the Supabase recovery email on the same browser/device. Set your chosen password, confirm it, then return to the login page.
6. Sign in with the configured username (default: `admin`) and the password you just set.

The reset email is used only for first-time password setup or an occasional recovery. Normal admin visits do not need an email link.

## Change the username

1. Open `config.js`.
2. Change this line to the new username:

   ```js
   ADMIN_USERNAME: "admin",
   ```

3. Save and push `config.js` to GitHub. Render will redeploy the static site.

The login form gets its displayed/default username from this setting. The username is public configuration, not a secret; access is still protected by Supabase password authentication and the database Row Level Security policies.

## Change or reset the password

1. Open `/admin.html`.
2. Click **Set password for first use / Forgot password?**.
3. Open the recovery email and set a new password.

Do not place the password in `config.js`, `admin.js`, HTML, or GitHub. Supabase stores and verifies password credentials. If no email arrives, confirm that `ADMIN_EMAIL` has an Auth user in **Authentication → Users**, and that the admin page URL is included in **Redirect URLs**.

## Change the administrator email

The current admin email is `mkataif@gmail.com`. It appears in `config.js` and in the email checks inside `supabase/schema.sql` Row Level Security policies. If changing it, update both locations consistently and review/re-run the relevant SQL policies. Do not change only the front-end email.

## Important security notes

- `SUPABASE_ANON_KEY` / publishable key is intended for browser use when Row Level Security is enabled.
- Never put a Supabase `service_role` / secret key or a password in this static site.
- Keep the email-based admin checks in `supabase/schema.sql`; the username field alone is not a security boundary.
- Use a unique password and enable multi-factor authentication on the Supabase account when practical.
