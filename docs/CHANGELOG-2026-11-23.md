# K-tours Visitor Book & 3 MB Upload Fix — 23 November 2026

## Visitor Book fix
- The client was sending consent version `2026-11-22-v2`, while the server accepted only `2026-11-22-v1`. This caused every opted-in visitor POST to be rejected with HTTP 400 before insertion into `visitor_logs`.
- Both sides now use `2026-11-23-v3`, and the browser consent key is versioned to `ktours-visitor-consent-v3` so previous visitors are prompted again to confirm the updated disclosure.
- Replaced the invalid `ipdata.free` lookup URL with the documented HTTPS endpoint `https://ipwho.is/{ip}`. The free endpoint needs no API key; provider limits apply.
- Added a 24-hour in-memory location cache to conserve the third-party free lookup quota. The visitor row is still inserted if location lookup fails; city/country may then show as unavailable.
- Updated the English/Arabic consent copy, privacy notice and admin attribution to name ipwho.is.

## Image uploads
- Increased server and browser per-file upload limit to 3 MiB for both customer-review photos and admin gallery photos.
- A review still allows up to 2 photos.
- Updated the form hints and API error message.

## Deploy
Replace the updated files from this package in the GitHub repository and commit to `main`. Render should deploy automatically. No Render Environment variable or Neon schema change is required. After deployment, open the public website in a private/incognito window, accept the visitor log notice, then open `/admin.html` → Visitor book → Refresh. Existing visits that were rejected before the fix cannot be reconstructed retroactively.
