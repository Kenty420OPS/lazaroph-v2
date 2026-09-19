require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    })
  });
} catch (error) {
  console.error("Initialization error:", error);
  process.exit(1);
}

async function setAdminClaim() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.log("Usage: node set-admin-claim.js <uid-or-email>");
    process.exit(1);
  }

  try {
    let userRecord;
    if (identifier.includes('@')) {
      userRecord = await admin.auth().getUserByEmail(identifier);
    } else {
      userRecord = await admin.auth().getUser(identifier);
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    
    // Also ensure the users document is created for legacy fallback/UI reads
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`Successfully set admin claim for user: ${userRecord.email} (${userRecord.uid})`);
    process.exit(0);
  } catch (error) {
    console.error("Error setting admin claim:", error);
    process.exit(1);
  }
}

setAdminClaim();
