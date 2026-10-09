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
- Open: Firestore rules still allow admin client writes to orders (no code path uses it today); consider closing in Mission 10 hardening.
- Test orders from the Part B preview tests are kept until Part C; delete ALL of them then and re-activate payment methods.

## Current Mission

### Mission 10 (backlog)
1. Checkout: Not reproducible in code (finally block at app/checkout/page.tsx:218-220 resets loading on all error paths). Re-verify on production; optional hardening: remove the redundant setLoading(false) at line 140 and fall back to res.statusText when the error body is not JSON.
2. Store Settings: auto-clear status messages (e.g. "QR image updated.") after a few seconds. Done in PR #9, merge commit 563a697.
3. Admin Management: race condition on the last-superadmin check is a known limitation, low priority. Requires two superadmins demoting each other within about a second. Recovery: seed script sets the superadmin claim. If ever fixed, prefer a lightweight lock document over a counter.
4. Admin list filter: Done in PR #7, merge commit 4316f44.
5. Seed script (outside repo, lazaroph-seed): resolve firebase-admin via createRequire from the repo root, and merge existing claims instead of overwriting.
6. Cleanup: remove the redundant `block` class next to `flex` on the QR anchor in PaymentMethodsSettings.tsx. Done in PR #9, merge commit 563a697.
7. Turnover to the new owner: create their superadmin account, remove montoyaclark8@gmail.com and other test accounts (Admin Management, then Firebase Auth), review Firebase, Vercel, GitHub, and domain ownership.
8. Optional: add Vercel preview domains to Firebase Authorized domains if Google sign-in is needed on previews.
9. Verify the deactivate-then-reload case on checkout (an inactive method disappears from the dropdown) and confirm the full payment method snapshot (type, account name, account number) on the order doc. Both were skipped during Mission 9 verification.

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
