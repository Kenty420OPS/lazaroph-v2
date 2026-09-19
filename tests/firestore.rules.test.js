const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { setDoc, getDoc, doc, collection, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp, setLogLevel } = require('firebase/firestore');
const fs = require('fs');

setLogLevel('error');
let testEnv;

async function runTests() {
  testEnv = await initializeTestEnvironment({
    projectId: 'lazaroph-v2',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  await testEnv.clearFirestore();

  const guestDb = testEnv.authenticatedContext('guest1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const guest2Db = testEnv.authenticatedContext('guest2', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const adminDb = testEnv.authenticatedContext('admin1', { role: 'admin', firebase: { sign_in_provider: 'password' } }).firestore();
  const nonAnonDb = testEnv.authenticatedContext('user1', { firebase: { sign_in_provider: 'password' } }).firestore();

  let passed = 0;
  let failed = 0;

  async function test(name, promise, shouldSucceed) {
    try {
      if (shouldSucceed) {
        await assertSucceeds(promise);
      } else {
        await assertFails(promise);
      }
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name}`);
      console.error(e.message);
      failed++;
    }
  }

  console.log("--- Starting Rules Tests ---");

  // Positive Test Cases
  await test("guest creates own conversation with valid schema (allow)", setDoc(doc(guestDb, 'conversations', 'guest1'), { customerId: 'guest1', customerName: 'Guest', lastMessage: 'first', updatedAt: serverTimestamp(), unreadAdmin: 1, unreadCustomer: 0 }), true);
  await test("guest adds first message (allow)", addDoc(collection(guestDb, 'conversations', 'guest1', 'messages'), { senderId: 'guest1', role: 'customer', text: 'first', createdAt: serverTimestamp(), read: false }), true);
  await test("guest reads own thread (allow)", getDoc(doc(guestDb, 'conversations', 'guest1')), true);
  
  await test("guest sends a second message with unreadAdmin +1 (allow)", updateDoc(doc(guestDb, 'conversations', 'guest1'), { lastMessage: 'second', updatedAt: serverTimestamp(), unreadAdmin: 2, unreadCustomer: 0 }), true);
  
  // To test clearing unreadCustomer, we need unreadCustomer to be > 0. The admin can set it.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await updateDoc(doc(db, 'conversations', 'guest1'), { unreadCustomer: 2 });
  });

  await test("guest clears unreadCustomer to 0 (allow)", updateDoc(doc(guestDb, 'conversations', 'guest1'), { unreadCustomer: 0 }), true);
  
  await test("admin-claim reply plus conversation update (allow)", Promise.all([
    addDoc(collection(adminDb, 'conversations', 'guest1', 'messages'), { senderId: 'admin1', role: 'admin', text: 'reply', createdAt: serverTimestamp(), read: false }),
    updateDoc(doc(adminDb, 'conversations', 'guest1'), { lastMessage: 'reply', updatedAt: serverTimestamp(), unreadCustomer: 1 })
  ]), true);


  // Negative Test Cases
  await test("guest sets unreadCustomer to 5 (deny)", updateDoc(doc(guestDb, 'conversations', 'guest1'), { unreadCustomer: 5 }), false);
  await test("guest lowers or resets unreadAdmin (deny)", updateDoc(doc(guestDb, 'conversations', 'guest1'), { lastMessage: 'test', updatedAt: serverTimestamp(), unreadAdmin: 0, unreadCustomer: 1 }), false);
  
  await test("guest creating conversation under another uid (deny)", setDoc(doc(guestDb, 'conversations', 'guest2'), { customerId: 'guest1', customerName: 'Guest', lastMessage: 'a', updatedAt: serverTimestamp(), unreadAdmin: 1, unreadCustomer: 0 }), false);
  
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'conversations', 'guest2'), { customerId: 'guest2' });
    await setDoc(doc(db, 'conversations', 'guest2', 'messages', 'msg1'), { text: 'test' });
  });

  await test("writing to another thread's messages (deny)", addDoc(collection(guestDb, 'conversations', 'guest2', 'messages'), { senderId: 'guest1', role: 'customer', text: 'hi', createdAt: serverTimestamp(), read: false }), false);
  await test("reading another thread's messages (deny)", getDocs(collection(guestDb, 'conversations', 'guest2', 'messages')), false);

  await test("unknown key (deny)", setDoc(doc(guestDb, 'conversations', 'guest_hacker'), { customerId: 'guest_hacker', customerName: 'Guest', lastMessage: 'a', updatedAt: serverTimestamp(), unreadAdmin: 1, unreadCustomer: 0, hacker: true }), false);
  
  await test("customerId change on update (deny)", updateDoc(doc(guestDb, 'conversations', 'guest1'), { customerId: 'guest2' }), false);
  await test("string counter (deny)", updateDoc(doc(guestDb, 'conversations', 'guest1'), { unreadAdmin: '2' }), false);
  await test("createdAt != request.time (deny)", addDoc(collection(guestDb, 'conversations', 'guest1', 'messages'), { senderId: 'guest1', role: 'customer', text: 'hi', createdAt: new Date('2000-01-01'), read: false }), false);
  await test("whitespace-only text (deny)", addDoc(collection(guestDb, 'conversations', 'guest1', 'messages'), { senderId: 'guest1', role: 'customer', text: '   ', createdAt: serverTimestamp(), read: false }), false);
  await test("read:true on create (deny)", addDoc(collection(guestDb, 'conversations', 'guest1', 'messages'), { senderId: 'guest1', role: 'customer', text: 'hi', createdAt: serverTimestamp(), read: true }), false);
  await test("sender spoof admin (deny)", addDoc(collection(guestDb, 'conversations', 'guest1', 'messages'), { senderId: 'guest1', role: 'admin', text: 'hi', createdAt: serverTimestamp(), read: false }), false);

  await test("non-admin authenticated (non-anonymous) user reading conversations list (deny)", getDocs(collection(nonAnonDb, 'conversations')), false);
  await test("non-anonymous user creating an order (deny)", setDoc(doc(nonAnonDb, 'orders', 'ord1'), { userId: 'user1' }), false);
  await test("non-anonymous user updating an order (deny)", updateDoc(doc(nonAnonDb, 'orders', 'ord1'), { status: 'shipped' }), false);

  await test("anonymous writes to products (deny)", setDoc(doc(guestDb, 'products', 'prod1'), { name: 'test' }), false);
  await test("anonymous reads orders (deny)", getDoc(doc(guestDb, 'orders', 'ord1')), false);
  await test("anonymous writes to users (deny)", setDoc(doc(guestDb, 'users', 'guest1'), { name: 'test' }), false);

  // Additional Restored Tests
  await test("guest lists conversations (deny)", getDocs(collection(guestDb, 'conversations')), false);
  await test("guest edits a message (deny)", updateDoc(doc(guestDb, 'conversations', 'guest1', 'messages', 'msg1'), { text: 'hack' }), false);
  await test("guest deletes a message (deny)", deleteDoc(doc(guestDb, 'conversations', 'guest1', 'messages', 'msg1')), false);
  await test("admin-claim lists all conversations (allow)", getDocs(collection(adminDb, 'conversations')), true);
  
  await test("user sets own role on create (deny)", setDoc(doc(nonAnonDb, 'users', 'user1'), { name: 'me', role: 'admin' }), false);
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'user1'), { name: 'me' });
  });
  await test("user sets own role on update (deny)", updateDoc(doc(nonAnonDb, 'users', 'user1'), { role: 'admin' }), false);
  
  await test("anonymous writes to orders (deny)", setDoc(doc(guestDb, 'orders', 'ord2'), { userId: 'guest1' }), false);
  await test("anonymous reads products (allow)", getDoc(doc(guestDb, 'products', 'prod1')), true);
  await test("guest deletes own conversation (deny)", deleteDoc(doc(guestDb, 'conversations', 'guest1')), false);
  
  // New tests
  await test("users doc role admin without claim does NOT grant admin access to conversations (deny)", getDocs(collection(nonAnonDb, 'conversations')), false);
  await test("non-admin authenticated user cannot write to products (deny)", setDoc(doc(nonAnonDb, 'products', 'prod1'), { name: 'test' }), false);

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  await testEnv.cleanup();
}

runTests().catch(console.error);
