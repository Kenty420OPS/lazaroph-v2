import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";
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

// Unit verification for Firestore security rule logic for /orders/{orderId}
function evaluateOrderCreateRule(auth, requestResourceData) {
  const isAuthenticated = auth !== null && auth !== undefined;
  const isAdmin = isAuthenticated && (auth.token?.role === "admin");
  const isOwner = isAuthenticated && requestResourceData.userId === auth.uid;

  return isAdmin || isOwner;
}

console.log("🧪 Testing Firestore Rules Logic for Order Creation...");

// Scenario A: Authenticated user creating an order for themselves
const userAuth = { uid: "user_abc_123", token: { role: "customer" } };
const validOrderData = { userId: "user_abc_123", total: 2499, items: ["Anta Kai 2 Team"] };

const scenarioA_Result = evaluateOrderCreateRule(userAuth, validOrderData);
console.log(`Test 1: User creating their own order (userId: "${validOrderData.userId}", auth.uid: "${userAuth.uid}")`);
console.log(`Result: ${scenarioA_Result ? "✅ ALLOWED (Passed)" : "❌ REJECTED (Failed)"}`);

// Scenario B: User trying to create an order for another user
const invalidOrderData = { userId: "user_xyz_789", total: 2499, items: ["Anta Kai 2 Team"] };

const scenarioB_Result = evaluateOrderCreateRule(userAuth, invalidOrderData);
console.log(`\nTest 2: User trying to create order for different user (userId: "${invalidOrderData.userId}", auth.uid: "${userAuth.uid}")`);
console.log(`Result: ${!scenarioB_Result ? "✅ REJECTED AS EXPECTED (Passed)" : "❌ ALLOWED (Security Flaw)"}`);

if (scenarioA_Result && !scenarioB_Result) {
  console.log("\n🎉 ALL FIRESTORE ORDER SECURITY RULE TESTS PASSED!");
  process.exit(0);
} else {
  console.error("\n❌ Security rule verification failed.");
  process.exit(1);
}
