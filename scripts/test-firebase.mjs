import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("🔥 Initializing Firebase with Project ID:", firebaseConfig.projectId);

async function runTest() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const testId = `test_${Date.now()}`;
    const testRef = doc(db, "_test_connection", testId);
    const testData = {
      message: "Firebase connection test successful",
      timestamp: new Date().toISOString(),
      status: "VERIFIED",
    };

    console.log(`📝 Writing test document to Firestore (_test_connection/${testId})...`);
    await setDoc(testRef, testData);
    console.log("✅ Document successfully written!");

    console.log("📖 Reading test document back from Firestore...");
    const snapshot = await getDoc(testRef);

    if (snapshot.exists()) {
      console.log("✅ Document retrieved successfully:");
      console.log(JSON.stringify(snapshot.data(), null, 2));
    } else {
      throw new Error("Document was not found after setDoc!");
    }

    console.log("🧹 Cleaning up test document...");
    await deleteDoc(testRef);
    console.log("✅ Test document deleted.");

    console.log("\n🎉 FIREBASE CONNECTION VERIFICATION PASSED SUCCESSFULLY! 🎉");
    process.exit(0);
  } catch (error) {
    console.error("❌ Firebase Connection Verification Failed:", error);
    process.exit(1);
  }
}

runTest();
