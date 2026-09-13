const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function seed() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    console.log('Creating/Signing in admin user...');
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, 'admin' + Date.now() + '@test.com', 'password123');
    } catch (e) {
      console.log('Error creating user:', e.message);
      return;
    }
    const uid = userCredential.user.uid;
    console.log('Signed in as:', uid);

    console.log('Setting admin role in Firestore...');
    await setDoc(doc(db, 'users', uid), { role: 'admin', email: userCredential.user.email });

    console.log('Adding products...');
    const products = [
      { name: 'Lazaroph Classic Sneakers', category: 'Sneakers', price: 5500, brand: 'Lazaroph' },
      { name: 'Urban Explorer Bag', category: 'Bags & Luggage', price: 3200, brand: 'Lazaroph' },
      { name: 'Sport Pro Watch', category: 'Watches', price: 8900, brand: 'Lazaroph' }
    ];

    for (const p of products) {
      await addDoc(collection(db, 'products'), p);
      console.log('Added:', p.name);
    }

    console.log('Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}
seed();
