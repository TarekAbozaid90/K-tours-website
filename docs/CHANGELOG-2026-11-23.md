# K-tours Visitor Book & 3 MB Upload Fix — 23 November 2026

## Visitor Book fix
- The client was sending consent version `2026-11-22-v2`, while the server accepted only `2026-11-22-v1`. This caused every opted-in visitor POST to be rejected with HTTP 400 before insertion into `visitor_logs`.
- The client/server consent version is now `2026-11-23-v4`, and the browser key is `ktours-visitor-consent-v4`; existing visitors are prompted again to confirm the revised provider disclosure.
- Replaced the invalid `ipdata.free` lookup URL with the documented HTTPS endpoint `https://ipwho.is/{ip}`. The free endpoint needs no API key; provider limits apply.
- Added a 24-hour in-memory location cache to conserve the third-party free lookup quota. The visitor row is still inserted if location lookup fails; city/country may then show as unavailable.
- Updated the English/Arabic consent copy, privacy notice and admin attribution to name ipwho.is.

## Image uploads
- Increased server and browser per-file upload limit to 3 MiB for both customer-review photos and admin gallery photos.
- A review still allows up to 2 photos.
- Updated the form hints and API error message.

## Deploy
Replace the updated files from this package in the GitHub repository and commit to `main`. Render should deploy automatically. No Render Environment variable or Neon schema change is required. After deployment, open the public website in a private/incognito window, accept the visitor log notice, then open `/admin.html` → Visitor book → Refresh. Existing visits that were rejected before the fix cannot be reconstructed retroactively.


## Admin improvements – 2026-11-23

- Read visitor client IP from Cloudflare `CF-Connecting-IP` first and Render `X-Forwarded-For` first entry as fallback, addressing the proxy IP being geolocated instead of the visitor.
- Added a second IP geolocation provider (`ipapi.co`) as a fallback and bounded retries for older visitor rows with missing country data. Render/Cloudflare client-IP forwarding headers are used before falling back to Express proxy resolution.
- Added dashboard statistics for visits, reviews, average rating, gallery count, top countries and device types.
- Seeded the five original website gallery images into the database-backed gallery manager so existing images can be edited, hidden/shown, replaced, reordered and deleted.


## Visitor country, statistics and editable gallery follow-up

- Added `api.country.is` as a no-key country fallback, with ISO country codes converted to readable English country names via Node's `Intl.DisplayNames`. Existing `ipwho.is` and `ipapi.co` lookups are retained to enrich city/region when available.
- Visitor rows with either missing country name or country code are eligible for limited backfill retry. The consent notice is bumped to `2026-11-23-v5` and names all three lookup providers.
- Expanded Statistics with seven-day visit trend, unique consented browser count, country coverage, popular pages, referrer sources and browser distribution.
- No gallery data is reset; existing database-managed starter and uploaded photographs remain editable in the Photo gallery tab.


## Admin follow-up — 23 November 2026

- Added `api.country.is` before the existing IP lookup providers. Country codes are converted to readable country names; city/region enrichment continues through the other providers when available.
- Bumped the visitor disclosure to consent version `2026-11-23-v5`.
- Added a protected Retry missing countries action and limited missing-country backfills to six rows per admin load.
- Expanded Statistics with a seven-day visits trend, unique consented browsers, country coverage, popular pages, referrers and browser distribution.
- Existing first-party and administrator-uploaded gallery items remain editable in the Photo gallery tab. No database reset is required.
