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

## Current feature scope (v1)
1. Public product catalog — three categories: Sneakers, Bags & Luggage, Watches
   (NOTE: Apparel and the Jersey Customizer feature from the old site are
   REMOVED. Do not build a jersey/apparel customizer in v1.)
2. Admin panel (add/edit/delete products, image upload)
3. Customer ordering (cart, checkout, order tracking)
4. Admin-customer chat (built LAST, after 1–3 are stable)
