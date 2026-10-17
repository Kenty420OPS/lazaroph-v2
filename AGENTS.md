# LAZAROPH — Project Rules

## Stack (do not deviate from this)
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Database: Firebase Firestore ONLY — no MySQL, no other databases
- Backend logic: Next.js Route Handlers ONLY — no separate Java/Node backend
- Images: Firebase Storage, via signed server-side uploads only
- Hosting: Vercel
- Domain/DNS: Cloudflare (lazarophstore.com + admin.lazarophstore.com)

## Hard rules
1. The client (browser/React components) must NEVER call Firestore or Storage
   directly. All reads and writes go through /app/api/* route handlers.
2. Every write to Firestore that involves multiple steps (e.g. save product +
   attach image URL) must be wrapped in a transaction or batch — never two
   separate unguarded writes.
3. All Firestore security rules must default to public READ for products,
   brands, and categories. Only writes require admin auth.
4. Every new feature must be built on its own git branch, never directly on main.
5. Every feature must be verified in the Antigravity browser BOTH as a logged-in
   admin AND as a logged-out/anonymous visitor before being marked done.
6. Keep the existing visual design/layout/branding as close to the old site as
   reasonably possible (same colors, same overall look and feel, same logo and
   tagline). This rebuild is about fixing the foundation, NOT a redesign — a
   visual refresh is planned as a separate project later. Do not introduce a
   new design direction unless explicitly asked.
7. The admin panel lives on its own subdomain — admin.lazarophstore.com —
   separate from the customer storefront (lazarophstore.com), but this is for
   organization only — it is NOT a security boundary by itself. Every admin
   page and every admin-only API route must independently verify
   (server-side, not just in the UI) that the request comes from an
   authenticated user with an admin role, before returning any data or
   performing any action.
8. Chat image uploads (payment proof from customers, update photos from
   admin) must go through the same signed server-side upload flow as product
   images — never a direct client upload. Images must be resized/compressed
   (max ~800px width) on upload. Implement a scheduled cleanup (Cloud
   Function) that deletes chat images older than 60 days after an order is
   marked complete, to prevent unbounded storage growth — keep the order
   record itself (ID, amount, status) in Firestore even after its images are
   deleted, for audit purposes.
9. Always run `git status` and commit or stash changes before switching branches. 
   Never use the `git checkout -f` flag without explicit user consent.


## Current feature scope (v1)
1. Public product catalog — three categories: Sneakers, Bags & Luggage, Watches
   (NOTE: Apparel and the Jersey Customizer feature from the old site are
   REMOVED. Do not build a jersey/apparel customizer in v1.)
2. Admin panel (add/edit/delete products, image upload)
3. Customer ordering (cart, checkout, order tracking)
4. Admin-customer chat (built LAST, after 1–3 are stable)

## Done Missions

### Mission 9 (Done)
Store Settings and payment methods management.
- Payment methods (Gcash, Pay Maya, BPI) are no longer hardcoded. Stored in the Firestore `paymentMethods` collection.
- Superadmin-only API: /api/admin/payment-methods (create, edit, activate/deactivate, reorder) and /api/admin/payment-methods/qr (upload, replace, remove QR).
- Public read API /api/payment-methods returns active methods only; checkout loads from it.
- Storage rules: public read for payment-methods/ QR images.
- Orders: server-side validation of the selected payment method (must exist and be active, otherwise "Selected payment method is not available") and a snapshot of the method stored on the order.
- Admin UI: Store Settings tab (superadmin only), table above, form below.
- Verified on the Vercel preview: normal admin gets 403 on GET/POST payment-methods and 200 on /api/admin/orders; no token gets 401; deactivated method is rejected at order submit; QR loads for logged-out customers.
- Branch: feature/mission-9-store-settings (8 commits, 7c1f9ca..8bfc00a), merged to main via PR #5 (merge commit daaf8b1).
- Deploy note: storage rules must be deployed to the production Firebase project.

### Mission 9 Part B (shipping) - done
- Done in PR #13, merge commit e69ba48.
- Checkout requires an explicit shipping method (no preselection): LBC (fixed fee per region: Luzon 250, Visayas 320, Mindanao 320), Lalamove (Metro Manila only, city dropdown, rider-fee acknowledgment, online fee 0), Pickup (one branch, Marikina, fee 0, pay online first).
- Shared definitions: lib/shipping.ts, lib/branches.ts (hours and phone have TODO comments pending owner confirmation), lib/order-status.ts.
- Order statuses: non-Pickup = pending_payment, confirmed, shipped, completed, cancelled. Pickup = pending_payment, confirmed, ready_for_pickup, picked_up, cancelled. Legacy pending_verification is display-only.
- PATCH /api/admin/orders validates the status against the courier stored on the order. Duplicate app/api/admin/orders/[id]/route.ts was removed.
- Pickup orders store customer.address as "" and a server-built branch snapshot (branchId, branchName, branchAddress).
- Known limitation: the Lalamove free-text address is not cross-checked against the selected city.
- Closed in Mission 10 order-creation hardening (PR #23, f2c9f2f): Firestore rules now deny all client writes to /orders; admin order writes go through the API.
- Test orders from the Part B preview tests are kept until Part C; delete ALL of them then and re-activate payment methods.

### Products mission (Done)
- P1–P3: PR #15, merge commit ae6c5ee. Shared helpers in lib/product.ts, server image validation and rollback (up to 4 images, exactly 4 to publish, 1 MB per image), 4-slot admin form with client compression, "Simulate Upload Failure" removed.
- P4: PR #16, merge commit c63aac6. Draft/active filter: drafts hidden from the public catalog and from ordering, admin list shows Live/Draft with what is missing.
- P5a and P5b: PR #17, merge commit 0ad7a8f. Server-generated immutable SKU (LZPH-XXXXX), discountPrice (must be lower than price), subcategory, gender, key features, materials, care instructions; orders charge the effective price and store originalPrice and sku; shop grid shows the discounted price and the cart uses the charged price.
- P6: PR #18, merge commit da6c464. Public GET /api/products/[id] (404 for missing and non-live products with the same response) and the /shop/[id] detail page.
- P7: PR #20, merge commit 5f5f34e. Managed brand list: lib/brands.ts, public GET /api/brands, admin POST and DELETE /api/admin/brands (admin or superadmin; slug document id with create(); delete blocked while a product uses the brand), Brands tab in the admin panel, brand dropdown in the product form with server-side validation (legacy free-text brands stay editable when unchanged). No rename, no seed script.
- P9 (sizes): PR #30, merge commit e42343f.
  - S1 (cf6272d): optional size system with per-size stock, enforced on the server.
  - S2 (640c0ce): admin form size dropdown and per-size stock.
  - S3 (b5c7d01, 0abbab1): cart lines keyed by product id and size; size selector on the product page and "Select size" on the grid.
  - S4 (4a11bab): per-size stock check and decrement in one transaction.
  - S5 (9bed6db): size shown on order items in admin and track-order.
  - S6 (41a3054): stock restored once when an admin cancels an order (orders marked stockDecremented, stockRestored).

### Mission 10 hardening-small (Done)
- Done in PR #22, merge commit 6202d3b.
- Generic 500 responses no longer leak error.message to the client (orders, product DELETE, admin orders, public product list).
- Auth error responses are generic (401/403 with no internal detail).
- Stale discountPrice is cleared on product PUT when the new price makes it invalid.
- Admin email is trimmed and lowercased when creating an admin account.
- Public /api/products route is marked `export const dynamic = "force-dynamic"` to silence the "Dynamic server usage" build warning.
- Stale scripts/verify-mission-3.mjs removed.

### Mission 10 order-creation hardening (Done)
- Done in PR #23, merge commit 37b3eb0.
- Chat uid is derived from a verified Firebase ID token (Authorization: Bearer header), never from the form field (34dc6ba).
- Customer input validated and trimmed on the server: name (max 100), address (max 500, skipped for Pickup), referenceNumber (4–64 chars), contact (max 50, at least 7 digits after stripping non-digits). Cart capped at 50 line items. Stock checked against the summed quantity per product — no decrement at that point (superseded by P9/PR #30, which checks and decrements per-size stock in one transaction) (af1c848).
- Idempotent order creation: the client generates a UUID per checkout attempt (crypto.randomUUID) and sends it as idempotencyKey. The server uses it as the Firestore document ID, so a retry with the same key returns the existing order instead of creating a duplicate. Orders now have 36-character UUID ids (a1bbef7).
- Shared in-memory rate limiter extracted to lib/rate-limit.ts. /api/orders is limited to 10 requests per 10 minutes per IP (125cd14).
- firestore.rules: /orders/{orderId} block changed to `allow write: if false`; admin order writes go exclusively through the server-side API. Rules deployed to the lazaroph-v2 Firebase project after merge (f2c9f2f).
- Cart page: long order IDs (36-char UUIDs) now wrap with `break-all` instead of being truncated, and the date stays `shrink-0` so cards do not overflow (89c390f).

### Customer auth (Done)
- AuthProvider (contexts/AuthContext.tsx) wraps the app: onAuthStateChanged via the existing lib/firebase instance (no duplicate init), exposes user/loading/signOut; anonymous chat sessions are not treated as signed-in.
- AuthMenu (components/AuthMenu.tsx) in the /shop, /shop/[id] and /cart headers: "Sign in" link when signed out; truncated display name/email + "Sign out" button when signed in; pulse placeholder while auth loads (no flash); sign-out redirects to "/". Mobile: avatar initial instead of name, "Public Catalog"/"Continue Shopping" header buttons hidden below sm.

### Homepage categories (Done)
- Done in PR #27, merge commit c18e58a.
- Optional per-category image and tagline, plus a "Show on homepage" toggle, handled on the server (87451ba).
- Admin category editor with a product count; homepage cards use the managed image and tagline (9aaef0e, ca0b7b9).
- firestore.rules and storage.rules: deny unlisted paths, close client writes to categories, and allow public read of category images (edba6b7). Rules deployed to the lazaroph-v2 Firebase project.

### Category disable (Done)
- Done in PR #29, merge commit 33fbb3a.
- `disabled` flag on the public category list and the admin PUT (fcb6b37).
- New or changed products reject disabled categories (76d77ef).
- Admin Disable/Enable button and badge (06ac043).
- Disabled categories are hidden from the homepage and from the shop pills, and /shop?category=<disabled> falls back to All (94d827d).
- Production test passed.

### Checkout payment step (Done)
- Done in PR #32, merge commit 33ec57a (commit 8a11c34).
- The checkout is split into two steps in the same form (noValidate, step-aware onSubmit). Step 1 = Order Summary and Shipping Information with "Proceed to Payment Details"; step 2 = Payment Details only, with a large QR, "Total to pay", Back and Submit Order.
- Steps are hidden with the `hidden` class, not unmounted, so the proof-of-payment file survives Back.
- The order FormData, Authorization header, idempotency key and redirect are unchanged.

## Current Mission

### Storefront design (Done)
- Homepage only (presentation only, no behaviour or data-fetching changes). White and black only: #0A0A0A / #FFFFFF, secondary text #6B6B6B on white and #B3B3B3 on black.
- app/page.tsx rebuilt with the sections in order: hero (logo on a white tile), trust points, featured categories, shop by brand, trending, new arrivals, store info, footer — alternating black/white as specified.
- New components under components/home/: SiteHeader (LAZAROPH wordmark only, "v2" badge removed, keeps AuthMenu + cart), ProductSections (trending + new arrivals, one GET /api/products), BrandTiles (GET /api/brands, falls back to the brands on live products when the managed list is empty), SiteFooter (logo on a white tile, links, Marikina pickup branch from lib/branches).
- Categories still come from getPublicCategories(), so the managed image/tagline/toggle and the enabled-only filtering are unchanged; disabled categories stay hidden.
- "v2" badge removed from the /shop, /shop/[id] and /cart headers and from the metadata title; tagline there bumped from text-[10px] to text-xs. AuthMenu buttons got min-h-11 (44px) tap height.
- Verified on the local production build at 375px and 768px: no horizontal overflow, no text below 12px, all homepage tap targets >= 44px, product rails render real products (discounted prices included) and the footer/store-info data renders.
- npx tsc --noEmit and npm run build pass (lint skipped, no ESLint config). Branch feature/storefront-design, not committed yet.

### Shop gender filter (Done)
- Add Men/Women/Kids filter pills next to category pills on /shop. 
- API /api/products accepts ?gender=Men|Women|Kids and returns products where gender matches or is "Unisex" or empty (treated as Unisex). 
- Category logic unchanged.

### Mission 10 (backlog)
1. Checkout: Not reproducible in code (finally block at app/checkout/page.tsx:218-220 resets loading on all error paths). Re-verify on production; optional hardening: remove the redundant setLoading(false) at line 140 and fall back to res.statusText when the error body is not JSON.
2. Store Settings: auto-clear status messages (e.g. "QR image updated.") after a few seconds. Done in PR #9, merge commit 563a697.
3. Admin Management: race condition on the last-superadmin check is a known limitation, low priority. Requires two superadmins demoting each other within about a second. Recovery: seed script sets the superadmin claim. If ever fixed, prefer a lightweight lock document over a counter.
4. Admin list filter: Done in PR #7, merge commit 4316f44.
5. Seed script (outside repo, lazaroph-seed): resolve firebase-admin via createRequire from the repo root, and merge existing claims instead of overwriting.
6. Cleanup: remove the redundant `block` class next to `flex` on the QR anchor in PaymentMethodsSettings.tsx. Done in PR #9, merge commit 563a697.
7. Turnover to the new owner: Done (Oct 9, 2026) — see Final Cleanup section.
8. Optional: add Vercel preview domains to Firebase Authorized domains if Google sign-in is needed on previews.
9. Verify the deactivate-then-reload case on checkout (an inactive method disappears from the dropdown) and confirm the full payment method snapshot (type, account name, account number) on the order doc. Both were skipped during Mission 9 verification.
10. Products gap: public product routes use the client SDK; draft hiding is app-level only, so Firestore rules still allow public reads of draft products. Consider moving public routes to the Admin SDK and closing public read.
11. Products gap: brand matching is exact and case-sensitive; renaming brands is not supported.
12. Products gap: the brand in-use check on delete is not atomic with product creation (very small race).

### Known gaps (post-PR #30)
- In-memory rate limiting is per serverless instance, not shared across Vercel cold-start instances. It slows simple abuse but does not provide a hard global cap. If shared IPs get spurious 429s, raise the limit or migrate to an external store (e.g. Upstash Redis).
- Stock bookkeeping after a cancel is one-way: moving a cancelled order back to another status does not decrement stock again, and a later cancel does not restore it twice (stockRestored stays true). Stock is only restored once per order, by the cancel itself.
- Orders created before PR #30 have no stockDecremented marker, so cancelling them does not change stock.
- A retry with the same idempotency key and contact but a changed cart returns the original order silently. The client never sends a changed cart on retry (it reuses the same FormData), so this is not a real problem today, but it is a known behaviour.
- The checkout page still sends a `uid` form field; the server ignores it (uid now comes from the verified ID token). The dead field can be removed in a future cleanup.
- The chat feature still writes conversation and message documents to Firestore directly from the client, which conflicts with Hard Rule #1. This is a known architectural exception; the decision to migrate chat writes through the API is pending.
- The comment above the /orders Firestore rule still says "Admin can read/write all"; only the `allow write` line was changed. The comment should be updated when rules are next edited.
- /favicon.ico returns 404; no favicon is present in the repo.
- Checkout on iPhone: the step 2 fields and the Submit Order button overflow the right edge (grid items without min-w-0, plus a wide file input). The fix is deferred to Mission 12 and blocks launch until fixed.
- Browser Back on the checkout leaves the page instead of returning to step 1.

### Status and next (Oct 13, 2026)
- Mission 10 hardening (PR #22 and PR #23) is merged and deployed.
- Owner browser tests for Products P3–P7 (test products only) are still to be confirmed.
- Next: homepage categories, then storefront design and logo (including favicon), policy pages, and the Part C end-to-end test.

## Final Cleanup (do LAST, after all missions)

Decision (Oct 7, 2026): stick to the missions; cleanup items are deferred to the end.

Auth / accounts
- Add "Forgot password?" to the admin login (Firebase sendPasswordResetEmail; only works for real emails).
- Add superadmin-only "Reset Password" button in Admin Management (server route, Admin SDK updateUser; 401 no token, 403 non-superadmin).
- Replace fake @lazaroph.com admin emails with real ones where needed (especially the owner/superadmin account), then delete the old fake Auth accounts. Create the replacement and confirm login BEFORE deleting.

Mission 10 leftovers moved here / to Mission 11
- #5 Seed script (outside repo): optional, skip unless needed
- #8 Authorized domains (only if Google sign-in is used on preview)
- #9 Verification (deactivate-then-reload, full snapshot in order doc)
- #10 Admin mobile layout

Turnover (#7) — DONE (Oct 9, 2026)
- Service account key rotation done: rotate FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL and FIREBASE_PROJECT_ID together from the same JSON; paste without quotes; redeploy Production; test "Add Payment Method"; delete old keys only after Production passes.
- Ownership decisions: the owner stays the owner of Firebase, Vercel and GitHub; the team uses the website. Janous is not added to the Firebase project.
- Production re-test passed, the new superadmin can log in, and test accounts are disabled.
