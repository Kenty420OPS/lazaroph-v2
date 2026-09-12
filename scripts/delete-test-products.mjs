import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

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

async function deleteTestProducts() {
  console.log("🧹 Initializing Firestore data cleanup...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const snapshot = await getDocs(collection(db, "products"));
  let deletedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const name = data.name || data.title || "";
    if (name.toLowerCase().includes("storage test product")) {
      console.log(`🗑️ Deleting test document ID [${docSnap.id}]: "${name}"...`);
      await deleteDoc(doc(db, "products", docSnap.id));
      console.log(`✅ Successfully deleted document [${docSnap.id}].`);
      deletedCount++;
    }
  }

  console.log(`\n🎉 Data cleanup complete! Total test documents removed: ${deletedCount}`);

  // Re-verify remaining products
  const newSnapshot = await getDocs(collection(db, "products"));
  console.log(`\n📦 Remaining products in Firestore 'products' collection (${newSnapshot.size}):`);
  newSnapshot.forEach((d) => {
    console.log(` - [${d.id}]: ${d.data().name || d.data().title} | Category: ${d.data().category} | Price: ₱${d.data().price}`);
  });

  process.exit(0);
}

deleteTestProducts();
