import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { setDoc, doc } from "firebase/firestore";
import fs from "fs";
import path from "path";

const PROJECT_ID = "demo-lazaroph-rules-test";
const rulesPath = path.resolve(process.cwd(), "firestore.rules");
const rulesContent = fs.readFileSync(rulesPath, "utf8");

console.log("🔥 Loading actual 'firestore.rules' from disk...");
console.log("---------------------------------------------------");
console.log(rulesContent.trim());
console.log("---------------------------------------------------\n");

async function runEmulatorTest() {
  let testEnv;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: rulesContent,
        host: "127.0.0.1",
        port: 8080,
      },
    });

    console.log("🧪 Running tests against live Firestore Rules Engine / Emulator...\n");

    // Context 1: Authenticated User "user_abc_123"
    const aliceDb = testEnv.authenticatedContext("user_abc_123", { role: "customer" }).firestore();

    // Test 1: User creates an order with their OWN userId
    console.log("Test 1: User 'user_abc_123' creating order for themselves (userId: 'user_abc_123')...");
    const validOrderRef = doc(aliceDb, "orders", "order_valid_001");
    await assertSucceeds(
      setDoc(validOrderRef, {
        userId: "user_abc_123",
        total: 2499,
        items: ["Anta Kai 2 Team"],
        createdAt: new Date().toISOString(),
      })
    );
    console.log("✅ RESULT: assertSucceeds PASSED! (The document creation was allowed by firestore.rules)\n");

    // Test 2: User tries to create an order with ANOTHER user's userId
    console.log("Test 2: User 'user_abc_123' trying to create order for 'other_user_789' (userId: 'other_user_789')...");
    const invalidOrderRef = doc(aliceDb, "orders", "order_invalid_002");
    await assertFails(
      setDoc(invalidOrderRef, {
        userId: "other_user_789",
        total: 2499,
        items: ["Anta Kai 2 Team"],
        createdAt: new Date().toISOString(),
      })
    );
    console.log("✅ RESULT: assertFails PASSED! (The document creation was REJECTED by firestore.rules as expected)\n");

    console.log("🎉 REAL FIRESTORE.RULES EMULATOR VERIFICATION SUCCESSFUL! 🎉");
    await testEnv.cleanup();
    process.exit(0);
  } catch (error) {
    console.error("❌ Firestore Emulator Rules Test Failed:", error);
    if (testEnv) await testEnv.cleanup();
    process.exit(1);
  }
}

runEmulatorTest();
