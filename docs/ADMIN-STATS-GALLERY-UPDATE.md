# K-tours Admin, Visitor Location & Gallery Update

This update is designed for the existing `K-tours-website` Render/Neon deployment.

## What changes

- Visitor IP resolution now checks Cloudflare `CF-Connecting-IP`, then the first IP in Render's `X-Forwarded-For`, then Express's resolved IP. This avoids geolocating the Render/Cloudflare proxy address instead of the visitor address.
- Location lookup uses `api.country.is` for a country baseline, then `ipwho.is` and `ipapi.co` to enrich city/region if available. The API response can still be unavailable for private, reserved, VPN, or rate-limited addresses. Failed lookups do not stop visitor logging. The consent notice version is updated so existing visitors see the revised provider disclosure. The protected Visitor Book retries rows with no country name in small batches (up to 6 per page load). Use **Retry missing countries** to queue another pass; a country code is converted to a readable country name in the UI when possible.
- Admin dashboard gains a Statistics tab: total visits (last 30 days), today's visits, review totals, pending/approved reviews, average rating, gallery totals, top visitor countries and device types, a seven-day traffic trend, unique consented browsers, country coverage, popular pages, referrer sources and browser distribution.
- The original five hard-coded gallery items are copied into the database-managed gallery once at startup. A setting flag prevents deleted starter photos from being re-seeded after a restart.
- Gallery management now supports English and Arabic titles, category editing, show/hide, replacing an image, moving an item up/down, and deleting it.
- The public gallery is rendered from the admin-managed database list, so edits and order changes appear on the website. The existing public image lightbox continues to work for dynamically loaded gallery images.

## Files in this patch

- `server.js`
- `public/admin.html`
- `public/admin.js`
- `public/admin.css`
- `public/app.js`
- `public/privacy.html`
- `README.md`
- `docs/CHANGELOG-2026-11-23.md`

## Apply to GitHub

1. Download and extract `K-tours-Admin-Stats-Gallery-Patch.zip`.
2. Copy the included files into the same paths in the root of the existing `K-tours-website` repository.
3. Commit the changes to `main`.
4. Render should deploy the commit automatically if auto-deploy is enabled. Otherwise choose Manual Deploy → Deploy latest commit.
5. Wait for the service to finish deploying. No Render Environment variable changes are required.

## Database migration

No manual SQL is needed. At startup `server.js` adds `gallery.source_url`, `gallery.title_ar`, `visitor_logs.geo_checked_at`, and the `app_settings` table if missing. It then imports the five original website gallery images once. The migration does not delete reviews, visitor entries, or uploaded photos.

## Verify

1. Open `/api/health`; expect `database: connected`.
2. Sign in at `/admin.html`.
3. Open Statistics; check that the page loads values from `/api/admin/stats`.
4. Open Photo gallery; the five original photos should appear alongside administrator-uploaded images.
5. Edit one title in English/Arabic, hide and re-show an item, move it up/down, and test image replacement with a JPG/PNG/WebP file no larger than 3 MB.
6. Open the public homepage; confirm the gallery reflects the changes and the photo lightbox still opens.
7. Open Visitor book; rows with missing country are retried gradually. New rows use the visitor IP forwarded by Render/Cloudflare. Location is approximate and may still be unavailable for VPNs, carrier gateways, private/reserved IPs or provider rate limits.

## Notes

- No schema reset is performed. Existing reviews, gallery uploads and visitor rows remain in place.
- The provider lookup is a third-party request after visitor opt-in. All three providers are named in the bilingual privacy notice.
- Country/city estimates are not GPS-level location.


## Follow-up update: country and analytics

- New consent notice version is `2026-11-23-v5`; the browser will ask visitors again because the lookup-provider disclosure changed.
- Country.is is a no-key country fallback; ISO codes are converted to readable country names on the server. The city/region remains approximate and may be blank even when a country is found.
- The Statistics tab now includes the last-7-days traffic bars, distinct consented browser references, country coverage, popular paths, referrers and browsers.
- The Photo gallery tab manages the original five seeded items and later uploads. No manual database reset or environment-variable update is required.

- Added a protected **Retry missing countries** action in Visitor Book; it queues missing-country rows for the normal six-at-a-time lookup pass.
