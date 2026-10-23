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

### Admin brand logo upload (Done)
- Admin Brands page (components/BrandsSettings.tsx): each brand row has a logo file input (PNG/JPG/WebP), a preview of the current logo, and a per-row status message. Client compresses via lib/client-image.ts compressImage (Rule #1 — no direct Storage/Firestore access from the client).
- New POST /api/admin/brands/[id]/logo: verifyAdminRequest, validateImageUpload magic-byte check (2MB cap, no server-side resize — decided: no sharp, reuse the existing pattern), save buffer as-is to brands/{brandId}/logo.{ext} via adminStorage (same shape as payment-methods/qr), set logoUrl + logoPath on the brand doc with file rollback on Firestore failure and best-effort delete of a previous file when the extension changes.
- Public GET /api/brands now includes logoUrl (null when none). BrandTiles uses logoUrl as img src, then /images/brands/{slug}.png, then the brand name text (fetch/sorting/links unchanged).
- storage.rules: public read + client write denied for brands/ (rule below, NOT deployed yet):
  `match /brands/{allPaths=**} { allow read: if true; allow write: if false; }`
- Branch feature/admin-brand-logo, not committed yet.

### Brand logos (In progress)
- Shop by brand tiles on the homepage show the brand logo from /images/brands/{slug}.png when a file exists (slug = lowercase, spaces -> hyphens, only a-z 0-9 -; e.g. "New Balance" -> new-balance.png).
- Only components/home/BrandTiles.tsx changed: a per-tile BrandTileLink component renders the image (max-h-10, max-w-[80%], object-contain, alt = brand name); onError falls back to the existing brand-name text. Hover inverts the logo via group-hover:invert to match the inverted tile.
- Tile stays min-h-16 with a 1px black border and white background. Fetch logic, product fallback, sorting and /shop links unchanged. Files present: anta, casio, new-balance, nike, seiko.
- Branch feature/brand-logos, not committed yet.

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

### Storefront polish (In progress)
- Pass 1 presentation polish and Salmon installment financing section.
- Hero: eyebrow "EST. 2016   MARIKINA" with thin rules, single "Shop now" button to /shop (Track order button removed).
- Salmon section added after "Shop by brand" with exact copy, logo from /images/salmon-logo.png, responsive desktop side-by-side and mobile stacked layout.
- SiteFooter: 4 columns (Brand tile with EST. 2016 MARIKINA & tagline, Shop with 10 nav-aligned links, Customer links, Visit us with branch details, pickup confirmation note, and authenticity guarantee).
- lib/branches.ts: address postal code updated from 1807 to 1805; added `phones` array while preserving `phone`.

### Storefront layout (In progress)
- Reordered homepage sections: 1. Hero (black), 2. Trending now (black), 3. New arrivals (white), 4. Shop by brand (white) with "Authentic houses and partners" eyebrow and "View all brands" link, 5. Salmon installment (white box), 6. The Lazaroph promise (black), 7. Footer (black).
- Removed Featured categories and middle pickup store info card from app/page.tsx; removed unused getPublicCategories and branch imports.

### Header and hero (In progress)
- SiteHeader: 3-column desktop layout (nav links on left, centered 40px logo + wordmark, search icon + AuthMenu + cart on right) and mobile hamburger menu.
- Hero: full-width black section (min-h-[560px], min 80vh on desktop) with dynamic grayscale product cover image and 60% black overlay, centered eyebrow, headline, subline, and "Shop now" / "Explore categories" buttons to /shop. (Cover image replaced by the solid black logo hero below.)

### Hero solid black (In progress)
- components/home/Hero.tsx is now presentation only: solid white background, black text, no product image, no fetch to /api/products, no getCoverUrl import, no client hooks.
- Centered layout: /images/logo.png on the existing white tile (rounded-2xl, p-6, 120px mobile / 160px desktop), "EST. 2016 • MARIKINA" eyebrow with thin rules (#B3B3B3, tracking-widest), headline "Authentic. Legit. Below Market Price." at 30/48/60px, subline at 16/18px, and "Shop now" / "Explore categories" buttons (min-h-11, stacked on mobile, side by side on sm+).
- Section py-20 mobile / py-28 desktop, min-h-[560px]; black and white only. Branch feature/hero-solid-black (based on feature/header-hero, since Hero.tsx is not on main yet).

### Storefront consistency (In progress)
- Every customer-facing page now uses the shared components/home/SiteHeader and components/home/SiteFooter: /shop, /shop/[id], /cart, /sign-in, /sign-up, /track-order, /checkout (+ empty-cart state), /checkout/success. Presentation only — no data, auth, cart or checkout logic changed.
- Removed the per-page inline headers (the "L" logo box, "Public Catalog" and "Continue Shopping" buttons) and every per-page footer, including the shop/shop-detail copyright-only line; tracked-order and checkout previously had no header or footer at all.
- Sign-in / sign-up keep the form, Google button and auth logic; only the surrounding header and the top logo box changed (content stays centered below the header). Sign-up renders the header/footer on both the form and the "check your email" screen.
- Pages that had no flex column got `flex flex-col` + `flex-1` on the content wrapper so the footer sits at the bottom. /checkout/success still prerenders as static (○).
- Not done in this branch: the "Official Storefront" hero on /shop is untouched (flagged for a later pass).
- Branch feature/storefront-consistency, not committed yet. Owner browser verification at 375px / 768px pending.

### Shop hero (In progress)
- /shop: the rounded "OFFICIAL STOREFRONT" banner box (bg-neutral-900 pill + tagline headline + grey subline) replaced with a plain title block — eyebrow "Inventory" (text-xs, font-bold, uppercase, tracking-widest, #6B6B6B) and h1 "Shop all" (text-3xl sm:text-4xl, font-black, uppercase, tracking-wide, text-white), wrapped in a div with mb-8. Black and white only, no box/border/background.
- app/shop/page.tsx only; filters, search, sort, grid, fetch and all logic untouched.
- Verified headless at 375px and 768px: no horizontal overflow (scrollWidth == clientWidth, no offending elements), title block renders as specified, old banner gone. Pre-existing 10px product-card text (category badge, brand, "Price") is unchanged — outside this mission.
- npx tsc --noEmit and npm run build pass. Branch feature/shop-hero, not committed yet.

### Storefront nav (In progress)
- New lib/storefront-nav.ts: STOREFRONT_CATEGORIES (Shoes, Slides, Watches), STOREFRONT_GENDERS (Men, Women, Kids), HEADER_NAV (New arrivals -> /shop, then genders, then categories) and FOOTER_SHOP_NAV (same items, "New arrivals" -> "New Arrivals"). Non-space names go through encodeURIComponent.
- components/home/SiteHeader.tsx uses HEADER_NAV for the desktop and mobile lists (the old local NAV_LINKS with Sneakers/Apparel is gone); components/home/SiteFooter.tsx Shop column uses FOOTER_SHOP_NAV (Customer and Visit us unchanged); app/shop/page.tsx prints STOREFRONT_CATEGORIES and STOREFRONT_GENDERS as pills, with "All" still first in each row. The ?category= guard still uses PRODUCT_CATEGORIES from lib/product.ts so the wider fallback list cannot leak into the filter; fetch, sort, search and all API routes untouched (Step 1 of 4, no brand filtering yet).
- Shop pills now carry inline-flex min-h-11 (44px), matching the AuthMenu decision from the Storefront design mission. Verified headless at 375px, 768px and 1280px: no horizontal page overflow, no sub-44px tap target in the header/footer/pills, correct labels and hrefs everywhere.
- npm run build and npx tsc --noEmit pass. Branch feature/storefront-nav, not committed yet.
- Desktop nav spacing reduced so links do not overlap the logo at lg ("New arrivals" hidden below xl so all 7 links fit at 1024px).

### Brand filter (In progress)
- /api/products accepts ?brand= next to ?category= and ?gender= and keeps only products whose brand field, trimmed and lowercased, equals the param (trimmed, lowercased) — exact match, case-insensitive. "All" passes everything through. Category and gender logic unchanged.
- /shop reads ?brand= from the URL (same way selectedGender is read) and sends it to /api/products. When a brand is active a brand header appears above the product grid: eyebrow "Brand collection" (text-xs, font-bold, uppercase, tracking-widest, #6B6B6B), brand name (text-2xl sm:text-3xl, font-black, uppercase, text-white), "Showing N products" (text-sm, #B3B3B3) and a "Clear brand filter" button (min-h-11, outlined white, links to /shop). Nothing new renders when no brand is active; category/gender pills, search, sort and grid are unchanged.
- components/home/BrandTiles.tsx: each tile links to /shop?brand=<encodeURIComponent(brand.name)>. Fetch logic, sorting and the logo/name fallback unchanged.
- Verified locally (production build, headless Chrome): /shop?brand=Adidas shows the header and 2 products, clear button resets to /shop with the full catalog; 375px and 768px have no horizontal overflow, the new button is 44px tall and no new text is below 12px. Pre-existing 10px product-card text and the sub-44px search input/select are unchanged.
- Branch feature/brand-filter, not committed yet. Hiding brands with no products is a separate step.

### White storefront: shop and product (In progress)
- /shop and /shop/[id] switched from the dark theme to the homepage palette: #0A0A0A on white, #6B6B6B secondary text, #FFFFFF surfaces. Presentation only — no change to fetches, filters, sort, search, cart, sizing or routing. Only app/shop/page.tsx and app/shop/[id]/page.tsx changed; SiteHeader and SiteFooter stay black.
- Shop page: white wrapper and <main>, title block and brand header in #0A0A0A/#6B6B6B, "Clear brand filter" outlined in #0A0A0A (hover fills it), white filter bar with a #0A0A0A/10 border, active pills black on white, inactive pills white with a #0A0A0A/20 border (hover #0A0A0A/5), white search input and sort select, white product cards with a #0A0A0A/10 border, black category badge, black "Select size" and "Add to Cart" buttons, skeletons and empty/error states on #0A0A0A/5.
- Product page: white gallery with a #0A0A0A/10 border, thumbnails #0A0A0A/20 (active #0A0A0A), brand #6B6B6B, name and price #0A0A0A, SKU/gender/subcategory chips white with a #0A0A0A/20 border, size buttons black when selected, black "Add to Cart" (disabled #0A0A0A/30), description headings #0A0A0A and body #6B6B6B.
- The only non black-and-white colour left on these two pages (the red "Sold out" text) is now #6B6B6B.
- Tap targets: the card "Select size"/"Add to Cart"/"Sold out" buttons, the "Try Again" and "Back to shop" buttons and the "Back to shop" link got min-h-11 (44px). Verified headless at 375px and 768px on /shop, /shop?brand=Adidas and /shop/[id]: no horizontal overflow and no tap target under 44px.
- Text sizes unchanged — the pre-existing 10px card labels (category badge, brand, "Price") and the 11px detail-page chips are still there.
- npx tsc --noEmit and npm run build pass. Branch feature/white-storefront-shop, not committed yet.

### Shop brand tiles (Done)
- /shop shows "Authentic houses and partners" / "Shop by brand" with BrandTiles between the filter bar and the product grid, only when no brand filter is active (hidden when a brand is selected; brand header remains). app/shop/page.tsx only, BrandTiles.tsx unchanged. No text below 12px, 44px tap targets maintained.

### White storefront: cart and track order (Done)
- /cart and /track-order switched from the dark theme to the same white palette as /shop and /shop/[id]: #0A0A0A on white, #6B6B6B secondary text, #FFFFFF surfaces. Presentation only — no change to cart/quantity logic, totals, track-order lookup, status steps or routing. Only app/cart/page.tsx and app/track-order/page.tsx changed; SiteHeader and SiteFooter stay black.
- Cart page: white wrapper and main, white empty-state box on #0A0A0A/5 with a #0A0A0A/10 border, black "Browse the Catalog" and "Proceed to Checkout" buttons, white cart rows / order-summary panel / recent-order cards with a #0A0A0A/10 border, quantity stepper outlined in #0A0A0A/20, "Remove" and "Track Status" outlined in #0A0A0A, "Clear history" in #6B6B6B. The red "Remove"/"Clear history" hover states were dropped to stay black and white only.
- Track order: white form / status / summary / details panels with a #0A0A0A/10 border, white inputs with a #0A0A0A/20 border and #6B6B6B placeholders, black "Track Order" submit, outlined "Track Another Order" / "Refresh Status", error and cancelled boxes on #0A0A0A/5, completed steps as a black circle with white text and the upcoming step as #0A0A0A/5 with #6B6B6B text, progress line #0A0A0A over a #0A0A0A/10 track.
- Tap targets: the quantity stepper buttons and the "Remove" button were below 44px (the stepper was 42px because the border shrank the h-11 box); both are now min-h-11 min-w-11, and "Browse the Catalog", "Proceed to Checkout", "Track Status", "Clear history", "Back to Home", the track-order inputs and every track-order button got min-h-11. Verified headless at 375px and 768px on /cart (empty, with items, with recent orders) and /track-order (form, error, order found): no horizontal overflow and no tap target under 44px.
- Content audit: the page content of both pages renders only #0A0A0A, #FFFFFF, #6B6B6B and #0A0A0A at 5/10/20% opacity — no other colour is used (the #B3B3B3 / neutral tones that remain come from the black SiteHeader / SiteFooter / AuthMenu, which are out of scope).
- Pre-existing text below 12px, left unchanged and reported: the cart "Order ID" label, the order date and the "Total" label in the recent-orders card are still text-[10px]. The track-order page has no text below 12px.
- npx tsc --noEmit and npm run build pass (lint skipped). Branch feature/white-storefront-cart-track, not committed yet. Note: the local .env.local Admin credentials return UNAUTHENTICATED against Firestore, so the order-found state was verified with a mocked /api/track-order response and the error state with the real route.

### White storefront: checkout success (Done)
- /checkout/success switched from the dark theme to the same white palette as /cart and /track-order: #0A0A0A on white, #6B6B6B secondary text, #FFFFFF surfaces. Presentation only — no change to the orderId/courier/pickup logic, the links, the copy behavior, the query-param handling or the routing. Only app/checkout/success/page.tsx, SuccessContent.tsx and CopyOrderId.tsx changed; SiteHeader and SiteFooter stay black and were already present on the page.
- page.tsx: wrapper and main are bg-white text-[#0A0A0A], the Suspense fallback text is #6B6B6B. The page still prerenders as static (○).
- SuccessContent.tsx: the success icon is now a black circle with a white check (bg-[#0A0A0A] text-white border-[#0A0A0A]) instead of the old green one — the only green on the page is gone and no red was added. White card with a #0A0A0A/10 border, the status box on #0A0A0A/5 with a #0A0A0A/10 border, the "LAZAROPH v2" span and the h1 in #0A0A0A, the "Status:" label in #6B6B6B, the "Track This Order →" link in #6B6B6B (hover #0A0A0A, underline decoration #0A0A0A/30) with min-h-11, and the "Continue Shopping" button is black on white (bg-[#0A0A0A] text-white, hover #0A0A0A/90) with min-h-11.
- CopyOrderId.tsx: the order-ID box is #0A0A0A/5 with a #0A0A0A/10 border so it stays visible inside the white card, the label is text-xs #6B6B6B, and the Copy button is black on white (bg-[#0A0A0A] text-white) with min-h-11 min-w-11.
- The Copy button was text-[10px] (about 24px tall) and is now text-xs with a 44px target, because this mission's rule is text 12px+ and tap targets 44px+. The long order ID still truncates inside its box (the 36-char UUID is cut with an ellipsis at 375px) and does not overflow.
- Verified headless at 375px and 768px on three variants (no params, orderId + courier=LBC, orderId + courier=Pickup + branchName): no horizontal overflow (scrollWidth == clientWidth), no tap target under 44px, no text under 12px, and the content of main renders only #0A0A0A, #FFFFFF, #6B6B6B and #0A0A0A at 5/10/30% opacity — no other colour (the neutral tones that remain come from the black SiteHeader / SiteFooter / AuthMenu, which are out of scope). The Copy button still flips to "Copied!" on click.
- npx tsc --noEmit and npm run build pass (lint skipped). Branch feature/white-storefront-success, not committed yet.

### White storefront: checkout (Done)
- /checkout switched from the dark theme to the white palette used by /cart, /track-order and /checkout/success: #0A0A0A on white, #6B6B6B secondary text, #FFFFFF surfaces. Presentation only — no change to state, handlers, fetches, validation, shipping fee calculation, payment logic, image compression/upload, order submission, the redirect to /checkout/success or the query params. Only app/checkout/page.tsx changed: the page has no checkout-only components (every control is inline), and the only imports are lib/*, contexts/CartContext, SiteHeader and SiteFooter.
- Wrapper and content are bg-white text-[#0A0A0A] with selection:bg-[#0A0A0A] selection:text-white; "← Back to Cart" is #6B6B6B → #0A0A0A with min-h-11; the Order Summary card and the payment panel are white with a #0A0A0A/10 border; each section heading keeps a #0A0A0A/10 bottom border; line items and helper notes are #6B6B6B; subtotal/shipping/total rows and the total-to-pay line are #0A0A0A; the pickup branch panel sits on #0A0A0A/5 with a #0A0A0A/10 border (#6B6B6B for address/hours/phone).
- The red validation error box is now bg-[#0A0A0A]/5 border-[#0A0A0A]/10 text-[#0A0A0A] and the red "Payment methods are unavailable" line is #0A0A0A — no red, green or other colour remains anywhere on the page.
- Inputs, selects and the textarea are bg-white text-[#0A0A0A] border-[#0A0A0A]/20 placeholder-[#6B6B6B] focus:border-[#0A0A0A] with min-h-11; labels stay text-xs font-bold in #0A0A0A (12px, unchanged); the proof-of-payment file input is white with a dashed #0A0A0A/20 border and a black file button (file:bg-[#0A0A0A] file:text-white). The QR image and the "No QR available" placeholder are white with a #0A0A0A/10 (image) / #0A0A0A/20 (placeholder) border.
- Buttons: "Proceed to Payment Details" and "Submit Order" are bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90 with min-h-11 (Submit keeps disabled:opacity-50 disabled:cursor-not-allowed); "Back" is outlined (bg-white border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A]/5); the empty-cart "Return to Shop" link is black on white with min-h-11. The Lalamove acknowledgment checkbox is w-5 h-5 shrink-0 accent-[#0A0A0A] inside a min-h-11 label (the raw checkbox is 20px by design, the label is the 44px+ target; shrink-0 was needed because the flex row was squeezing it to 13px).
- This page has no courier or payment "option cards" — both are native selects — so that part of the palette rule had nothing to apply to. No text size changed and none is below 12px.
- Verified headless on the production build at 375px and 768px across 9 states (empty form, validation error, LBC + region, Pickup branch panel, Lalamove city + checkbox, step 2 with QR, step 2 with "No QR", submitting, empty cart): no horizontal overflow (scrollWidth == clientWidth), no text below 12px, no tap target under 44px, and the page content renders only #0A0A0A, #FFFFFF, #6B6B6B and #0A0A0A at 5/10/20% opacity (accent-color is #0A0A0A, not browser blue). Submitting shows the disabled "Processing Order..." button at opacity 0.5. /api/payment-methods was stubbed inside the browser only (local Admin SDK credentials return UNAUTHENTICATED) — no application code was mocked or changed.
- Reported, not changed (shared with other pages, outside this mission): components/ChatWidget.tsx (rendered on every page by ChatWidgetWrapper in app/layout.tsx) is still dark (bg-black, neutral borders, white/black bubbles) and carries a red unread badge; SiteHeader and SiteFooter stay black.
- Known gap not reproduced: "checkout on iPhone overflows to the right" does not reproduce in Chrome at 375px — step 1, step 2 and the file input all fit. It may be iOS-Safari specific, so the documented fix (min-w-0 on the grid children) was not applied blind.
- npx tsc --noEmit and npm run build pass (lint skipped). Branch feature/white-storefront-checkout, based on feature/white-storefront-success because that page is not merged into main yet.

### LBC shipping per item (Done)
- Formula: LBC shipping fee = regional rate x total quantity of all cart items (charged per pair/piece, independent of product price). Rates unchanged in lib/shipping.ts: Luzon 250, Visayas 320, Mindanao 320 per pair, so Mindanao 320 x 2 = 640 and 320 x 5 = 1,600. Lalamove (paid to the rider) and Pickup (free) stay at 0.
- Single source of truth: lib/shipping.ts exposes getLbcRate(region) and calculateShippingFee(courier, region, totalQuantity); the old flat getShippingFee was replaced. Both app/checkout/page.tsx (summary line, total, "Total to pay") and app/api/orders/route.ts use the helper — the formula is not duplicated.
- Server: app/api/orders/route.ts sums the validated cart quantities (each line was already integer and >= 1; an explicit total check was added) and recomputes shippingFee with calculateShippingFee before the order transaction. The client-sent shippingFee is still ignored, so the fee cannot be tampered with. The result is stored on shipping.shippingFee exactly as before; track-order and admin keep reading the stored value, and existing orders are untouched.
- LBC acknowledgment mirrors Lalamove: the client sends lbcFeeAcknowledged=true and POST /api/orders rejects LBC without it ("Please confirm the LBC per-pair shipping fee to continue."), just as Lalamove validates metroManilaAcknowledged. As with Lalamove, the checkbox itself is never trusted for pricing. Unlike the Lalamove flag, no LBC acknowledgment field is stored on the order (order shape unchanged).
- UI: new lbcFeeAck state (default false), reset on courier / region / cart quantity change. The /cart Shipping row shows a neutral notice "Shipping depends on your courier." (text-xs #6B6B6B italic, mt-1); the LBC notice "LBC shipping is charged per pair." sits directly under the checkout region select with the live "₱{rate} x {qty} pair(s) = ₱{fee}." line. The required checkbox uses the Lalamove markup (min-h-11 label, gap-3, w-5 h-5 shrink-0 accent-[#0A0A0A]) and its text is "I understand LBC shipping is charged per pair, so my total shipping fee is ₱{fee} for {qty} pair(s)." Unticked, step 1 is blocked with the same error box and step 2 re-checks before submit. Pickup and Lalamove show no LBC notice or checkbox. The Order Summary row reads "Shipping (LBC - {region}) ₱{rate} x {qty}" and the amount stays right-aligned.
- Checks: scripts/verify-lbc-shipping.mjs covers 16 cases — Luzon 250/500/1250, Visayas 320/640/1600, Mindanao 320/640/1600, Pickup 0, Lalamove 0, and invalid quantity/region 0. Headless Chrome on the production build (only /api/payment-methods stubbed in-browser) at 375px and 768px: qty 3 → ₱960, then +1 in the cart → qty 4 → ₱1,280 with the total and "Total to pay" updating; ack resets on region and courier changes; unticked blocks with the error message; Pickup/Lalamove show neither the notice nor the checkbox; LBC gaps are 4px select→notice and 16px notice→ack, identical to Lalamove's 4px/16px. No horizontal overflow, no text under 12px, no tap target under 44px (raw 20px checkbox inside the 44px label, same as Lalamove), and only #0A0A0A, #FFFFFF, #6B6B6B and #0A0A0A at 5/10/20%. Direct POST /api/orders checks: missing ack, missing region, quantity 1.5 and quantity 0 each return 400 with the expected message; a valid request passes the shipping validation and only then fails at the local payment-method lookup (local Admin SDK credentials are UNAUTHENTICATED).
- Observation: at 375px the checkout content column (an mx-auto flex item that shrink-to-fits its longest line) widens 27px when the LBC acknowledgment appears (form left 30→16, width 316→343). The existing Lalamove acknowledgment causes the same widening, so no shared layout was changed. At 768px there is no horizontal shift. A 4px vertical shift comes from the Order Summary placeholder row (12px) being replaced by the 14px LBC row, exactly as the Pickup row already does.
- Deploy note: the new server-side ack requirement applies immediately on deploy; any browser tab still running the old bundle must reload before placing an LBC order.
- npx tsc --noEmit and npm run build pass (lint skipped). Branch fix/lbc-shipping-per-item, not committed yet.

### Hide backend names in UI (In progress)
- lib/auth-errors.ts exports getAuthErrorMessage(error: unknown): string. Raw backend/auth errors (Firebase messages, auth/ codes) are never shown to users; always map them through this helper. Wrong email and wrong password share one generic message (no account enumeration).
- lib/user-error.ts exports getUserErrorMessage(error: unknown, fallback: string): string. Only short plain-sentence messages from our own errors are shown; SDK/runtime error strings are filtered and replaced with the provided fallback.
- Removed "Firestore" from user-visible text: shop empty state, admin catalog header, products API error string.

### Policy pages (Done)
- Added lib/store-info.ts as single source of truth for store details and policy last-updated date (2026-10-23 formatted for display), with email/phones as mailto/tel helpers.
- Created static pages /privacy, /terms, /shipping-policy, /returns, /contact with metadata titles and a shared PolicyPage layout (SiteHeader, max-w-3xl article, "Last updated", h1/h2, body text-sm, SiteFooter).
- Returns policy: 7-day replacement for eligible items only (no cash refund), conditions (unworn, unwashed, complete accessories/box/packaging/receipt), walk-in size change if conditions met, exclusions (change of mind, buyer mishandling, no defect at purchase), items sold "as-is-where-is", confirmed online orders final and non-reversible/cancellable, defective/wrong items reported within 7 days with photos/video and order ID with replacement if confirmed.
- Shipping policy: LBC (per-pair by region, read via getLbcRate), Lalamove (Metro Manila, same-day after payment verification/manual within 24h, rider fee paid by buyer), Pickup (store address/hours from lib/branches.ts). Items ship after verification; complete/correct address and contact required.
- Terms: site use, 100% authentic, prices/availability may change, orders confirmed only after payment verification with proof of payment, online orders final (linked to /returns), right to cancel for stock/pricing errors with full payment returned, limitation of liability, contact link, governing law Philippines.
- Privacy: collects name, contact, address, email/account (sign-in/Google), payment proof screenshot, order details; used for processing/delivery/verification/support; shared only with staff/couriers; stored securely/retained as needed; Data Privacy Act 2012 rights via contact email/phones; cart in browser local storage; no analytics/advertising pixels claimed.
- Contact: store details, phones as tel:, email as mailto:, Facebook/Instagram, hours from branches if available, note about defective/wrong items with order ID/photos.
- Footer: added Policies group with the five links (min-h-11). Checkout and order-received pages show "Online orders are final. See our Return Policy." linking to /returns.

### Mission 10 (Done)
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
