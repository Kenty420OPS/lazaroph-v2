import { adminDb } from "../lib/firebase-admin";

async function run() {
  const doc = await adminDb.collection("orders").doc("l4C60Bl5LlYMhAxe1kKL").get();
  console.log(JSON.stringify(doc.data(), null, 2));
}
run();
