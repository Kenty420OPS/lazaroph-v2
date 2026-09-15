const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Testing connection to Firebase project: ' + firebaseConfig.projectId);
    
    // 1. Test READ (Should succeed because products have 'allow read: if true')
    console.log('\n--- Testing READ ---');
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      console.log('SUCCESS: Successfully read from products collection! Found ' + querySnapshot.size + ' documents.');
    } catch (e) {
      console.error('READ ERROR: ', e.message);
    }

    // 2. Test WRITE (Should FAIL because products have 'allow write: if isAdmin()' and we are unauthenticated)
    console.log('\n--- Testing WRITE ---');
    try {
      await addDoc(collection(db, 'products'), { name: 'Test Product' });
      console.log('WRITE SUCCESS (Unexpected - Security rules might be open)');
    } catch (e) {
      if (e.message.includes('Missing or insufficient permissions')) {
        console.log('SUCCESS: Write was blocked exactly as expected by your security rules!');
      } else {
        console.error('WRITE ERROR: ', e.message);
      }
    }
    
    console.log('\nAll tests completed. Firebase is successfully connected!');
    process.exit(0);
  } catch (e) {
    console.error('Error connecting to Firebase:', e);
    process.exit(1);
  }
}
testFirebase();
