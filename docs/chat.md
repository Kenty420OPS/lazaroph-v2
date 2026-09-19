# Real-Time Chat System & Security Walkthrough

This document outlines the architecture, security rules, and deployment instructions for the Customer-Admin chat feature.

## 1. Admin Authentication & Custom Claims (The Rollout)
The system enforces strict security via **Firebase Custom Claims**. The client does not dictate who is an admin, and we do not waste reads checking the `users` collection.
Because claims are not automatically set on signup, you must follow this rollout order for the Admin dashboard:

### Rollout Order
1. **Set the Claim**: Run the included Node script to assign the custom claim to your admin user. This script reads your Service Account credentials from `.env.local`.
   ```bash
   node scripts/set-admin-claim.js admin@lazarophstore.com
   ```
2. **Log in at `/admin`**: When the admin logs into the dashboard (`/admin`), the UI now forces a token refresh via `currentUser.getIdTokenResult(true)` and strictly verifies that `claims.role === 'admin'`. This proves the claim is in the token.
3. **Deploy Rules**: Deploy the strict custom-claim-only security rules.
   ```bash
   firebase deploy --only firestore:rules
   ```
4. **Test Chat on Localhost**: Open `localhost:3000` as a guest and ensure you can send a message and it appears in the admin panel.
5. **Push to GitHub**: Once verified, commit and push to your main branch to trigger the Vercel production deploy.

### Real Rollback
If you accidentally deploy the rules prematurely and lock out your admin or site, you can perform a real rollback: keep the previous `firestore.rules` file in your git history, check it out, and run `firebase deploy --only firestore:rules` to redeploy the old, looser rules while you fix the claim issue.

### Revoking an Admin
To completely revoke an admin's access, you must:
1. Use the Firebase Admin SDK to remove their custom claim (`admin.auth().setCustomUserClaims(uid, null)`).
2. Remove their `role` field from the `users/{uid}` Firestore document.
3. Call `admin.auth().revokeRefreshTokens(uid)` to kill their active session immediately.

## 2. Anonymous Auth & Session Persistence
- **Lazy Initialization**: The `ChatWidget.tsx` explicitly waits for the user to open the chat window before invoking `signInAnonymously()`.
- **Clearing Site Data**: Anonymous accounts are bound to the browser's IndexedDB. If a customer clears their browser site data or uses an Incognito window, they will generate a new Anonymous UID.

## 3. Pre-launch Requirements: Firebase App Check
**NOTE:** Enforcing Firebase App Check in the Firebase Console without first initializing the App Check client SDK in your React app **will break the entire site, including `/admin` reads/writes**. 
Before enforcing App Check, you must add the App Check client wrapper (using reCAPTCHA Enterprise) to your `app/layout.tsx` or Firebase initialization file.

## 4. Vercel Environment Variables
Ensure your Vercel project has the following standard Firebase config vars:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

And for the API routes (`lib/firebase-admin.ts`) and the `scripts/set-admin-claim.js` script, you must have the Admin SDK vars:
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (ensure `\n` characters are properly preserved in Vercel settings)
