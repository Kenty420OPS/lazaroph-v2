import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email = "admin@lazarophstore.com";
  const password = process.argv[2];

  if (!password) {
    console.error("? Please provide a password as an argument.");
    console.error("Usage: node scripts/create-admin.mjs <your-password>");
    process.exit(1);
  }

  let user;
  try {
    console.log("Checking if user " + email + " exists...");
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    user = userCred.user;
    console.log("? User already exists and signed in successfully.");
  } catch (error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      try {
        console.log("Creating new user...");
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        user = userCred.user;
        console.log("? Admin user created successfully.");
      } catch (createError) {
        console.error("? Failed to create user:", createError.message);
        process.exit(1);
      }
    } else {
      console.error("? Failed to sign in:", error.message);
      process.exit(1);
    }
  }

  if (user) {
    console.log("Assigning 'admin' role in Firestore...");
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      email: user.email,
      role: "admin",
      createdAt: new Date().toISOString()
    }, { merge: true });
    
    console.log("? Role 'admin' assigned to document users/" + user.uid);
    console.log("?? Setup complete! You can now log into the /admin panel using these credentials.");
    process.exit(0);
  }
}

run();
