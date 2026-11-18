# K-tours | Mohamed Kataif

A responsive, bilingual (English / Egyptian Arabic) tourism portfolio for Mohamed Kataif. Built with plain HTML, CSS and JavaScript. Recommended deployment: GitHub (source control) + Render Static Site (hosting) + Supabase (reviews, photo uploads and admin dashboard).

## Project structure

- `index.html` - public website.
- `styles.css` - responsive design and RTL support.
- `app.js` - language switch, WhatsApp enquiry, public reviews and gallery loading.
- `admin.html`, `admin.css`, `admin.js` - private dashboard for review moderation and gallery uploads.
- `config.js` - public Supabase project URL + public anon/publishable key, WhatsApp number, admin username and admin email. No password is stored in this file.
- `supabase/schema.sql` - tables, row-level security policies and Storage bucket setup.
- `assets/logo.png` - supplied K-tours logo.
- `assets/gallery/group-tour-giza.jpg` - group photograph supplied by Mohamed Kataif.
- `photo-credits.html` - attribution and licence details for third-party destination photographs.
- `ADMIN-LOGIN-SETUP.md` - first-time admin password setup and instructions for changing the username/password.
- `docs/K-tours-Guide-GitHub-Render-Supabase.pdf` - illustrated Arabic setup guide.
- `docs/K-tours-Guide-GitHub-Render-Supabase.docx` - editable source of the guide.

## Real destination photographs

The destination and hero photographs now use real photographs of Egyptian landmarks sourced from Wikimedia Commons. They are linked directly from Wikimedia's image delivery service to avoid shipping duplicate large copies in this starter package. Each photograph is listed in `photo-credits.html` with author, source file and licence. This means the browser needs an internet connection to load those third-party photographs. For maximum control and long-term stability, download the appropriately licensed image from its source page, keep its attribution, optimize it to WebP/JPEG, and host your own copy in the project or a dedicated storage bucket.

The Giza group photo is local to the project. Before publishing it publicly, confirm that the people shown have agreed to the photo being displayed on the website. The gallery now includes Historic Cairo, the Hanging Church, Philae Temple, Saqqara and the supplied K-tours group photograph.

## Illustrated deployment guide

Open the Arabic eight-page guide in `docs/` for the step-by-step GitHub, Render and Supabase workflow, including RLS/security reminders, test checklist and suggested improvements. For the current username/password admin login and first-time password setup, follow `ADMIN-LOGIN-SETUP.md` (it supersedes the older admin sign-in note in the PDF). The interface panels in the guide are explanatory illustrations; live dashboard labels and layouts can change.

## Run a local preview

From this folder run:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`. The public site can be previewed without Supabase. Without Supabase, review submissions are saved only in that browser. Guest reviews and photo submissions are not shared with visitors until Supabase is connected.

## Set up Supabase

1. Create a Supabase project at https://supabase.com/dashboard.
2. Open **SQL Editor** and run the complete file `supabase/schema.sql`.
3. In **Authentication → URL Configuration**, add the Render site URL and its admin page URL (`https://YOUR-SITE.onrender.com/admin.html`) to the allowed redirect URLs. Add your local preview URL while testing, e.g. `http://localhost:4173/admin.html`.
4. In Project Settings / API (or the Connect panel), copy the Project URL and the public `anon` / publishable key.
5. Paste those values into `config.js`:

```js
window.KTOURS_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-PUBLIC-ANON-OR-PUBLISHABLE-KEY",
  WHATSAPP_NUMBER: "201009494068",
  ADMIN_USERNAME: "admin",
  ADMIN_EMAIL: "mkataif@gmail.com"
};
```

6. The administrator email must match the email in both `config.js` and the SQL policies in `supabase/schema.sql`. The current default is taken from the supplied CV. If changing it, replace it in both files before running the SQL (or update the policies afterwards).
7. In **Authentication → Users**, make sure the administrator account `mkataif@gmail.com` exists. The existing account created by the previous magic-link setup can be reused. If it does not exist, create/invite this user from the Supabase Dashboard first.
8. Open `/admin.html` and use **Set password for first use / Forgot password?**. Supabase sends a recovery email to the configured administrator email. Open it on the same browser/device, choose the initial password, then sign in using username `admin` and that password. This email step is only for initial setup or password recovery; normal sign-ins use username + password.
9. Use the Reviews tab to approve or delete submissions. Use the Photo gallery tab to add or remove photographs.

### Change the admin username or password

- **Username:** edit only `ADMIN_USERNAME` in `config.js`, save, then commit/push the file to GitHub so Render redeploys. The login form reads the configured username automatically.
- **Password:** do not edit HTML/JavaScript to change it. On `/admin.html`, click **Set password for first use / Forgot password?**, open the reset email, and enter the new password twice. Supabase stores/verifies the password; it is never written into this repository.
- **Administrator email:** this is also used in the SQL Row Level Security policies. If you change `ADMIN_EMAIL`, update every matching email condition in `supabase/schema.sql` and re-run the relevant policy SQL. Keep the email consistent.

The reset redirect URL must be allowed under **Authentication → URL Configuration → Redirect URLs**. Add the full admin URL for the live Render domain, for example `https://YOUR-SITE.onrender.com/admin.html`, and the local admin URL if testing locally.

**Security:** only the public `anon` / publishable key belongs in `config.js`. Never put a `service_role` / secret key in a browser file or GitHub repository. Keep row-level security (RLS) enabled. The SQL allows public visitors to submit unapproved reviews; only the configured admin can read pending items, approve them or manage the public gallery.

## Deploy to Render from GitHub

1. Extract the ZIP. Create a GitHub repository named `k-tours-website`.
2. Upload the **contents** of this folder to the repository root so `index.html`, `styles.css`, `app.js`, `config.js`, `admin.html`, `assets/` and `supabase/` are at the top level. Do not upload the ZIP itself or nest the site one extra folder deep.
3. In Render choose **New + → Static Site**, connect GitHub and select the repository.
4. Choose branch `main`; leave Root Directory blank; leave Build Command blank; set Publish Directory to `.`; create the site.
5. Render provides an `onrender.com` address. Add the final address and `/admin.html` to Supabase's allowed redirect URLs.
6. Every push to the linked GitHub branch can trigger an automatic redeploy. Push the updated `config.js` after adding the Supabase public details.

The included `render.yaml` is optional; the dashboard flow above is the clearest first deployment path.

## Final launch checks

- Test the English / Arabic switch and mobile navigation.
- Open every navigation link and test the WhatsApp enquiry form.
- Connect Supabase and confirm a new guest review enters moderation as `approved = false`.
- Approve one test review and verify it appears publicly.
- Upload a guest photo; verify it is shown only with an approved review.
- Sign out of the admin dashboard and confirm public users cannot access admin controls.
- Test the site on a phone and check every destination photo.
- Check that the guest group photograph is approved for publication.
- Add the domain and social preview image after deciding the final brand domain.

## Further improvements worth considering

1. Add an itinerary request builder with date, group size, interests, language and accessibility notes.
2. Add individual destination pages with route length, visit duration, highlights and practical tips.
3. Add real verified testimonials with guest permission and country (never invent reviews).
4. Add a WhatsApp quick-booking button on each destination card with a prefilled place name.
5. Add search-engine metadata, sitemap.xml, robots.txt, Open Graph image and structured data for a tour guide / local business.
6. Add analytics with a privacy notice and a cookie choice if analytics cookies are used.
7. Add image compression and descriptive alt text; replace externally hosted images with optimized, licensed copies in your own storage.
8. Add spam protection / rate limiting to public review uploads before a high-traffic launch.
9. Add a separate Chinese interface after the English and Arabic content are signed off.

## Official setup references

- GitHub Docs: https://docs.github.com/
- Render Static Sites: https://render.com/docs/static-sites
- Render first deploy: https://render.com/docs/your-first-deploy
- Supabase Docs: https://supabase.com/docs
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase Auth URL configuration: https://supabase.com/docs/guides/auth/redirect-urls
