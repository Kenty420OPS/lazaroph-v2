import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";

// Load env vars
const envLocal = fs.readFileSync(".env.local", "utf8");
envLocal.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    process.env[key.trim()] = value.trim();
  }
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_KEY || "lazaroph-admin-secret-2026";

async function runVerification() {
  console.log("=================================================");
  console.log("  MISSION 3 VERIFICATION SUITE — LAZAROPH ADMIN ");
  console.log("=================================================\n");
  console.log(`Target URL: ${BASE_URL}`);

  let createdProductId = null;
  let testFailed = false;

  try {
    // -----------------------------------------------------------------
    // TEST 3: Security Verification - Non-admin/Logged-out Protection
    // -----------------------------------------------------------------
    console.log("\n[TEST 3] Verifying server-side Admin API security protection...");
    
    // Attempt GET /api/admin/products without x-admin-key header
    const unauthorizedGet = await fetch(`${BASE_URL}/api/admin/products`);
    console.log(`GET /api/admin/products (No Auth): Status ${unauthorizedGet.status}`);
    const unauthGetData = await unauthorizedGet.json();
    if (unauthorizedGet.status === 401 && !unauthGetData.success) {
      console.log("  ✓ PASS: GET /api/admin/products rejected unauthenticated request (401)");
    } else {
      console.error("  ✗ FAIL: GET /api/admin/products allowed unauthenticated access!");
      testFailed = true;
    }

    // Attempt POST /api/admin/products with invalid key
    const invalidPost = await fetch(`${BASE_URL}/api/admin/products`, {
      method: "POST",
      headers: {
        "x-admin-key": "invalid-secret-key-123",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Hacker Product", price: 100 }),
    });
    console.log(`POST /api/admin/products (Invalid Key): Status ${invalidPost.status}`);
    const invalidPostData = await invalidPost.json();
    if (invalidPost.status === 401 && !invalidPostData.success) {
      console.log("  ✓ PASS: POST /api/admin/products rejected invalid admin key (401)");
    } else {
      console.error("  ✗ FAIL: POST /api/admin/products accepted invalid key!");
      testFailed = true;
    }

    // -----------------------------------------------------------------
    // TEST 1: Add Product & Confirm Appearance on Public /shop
    // -----------------------------------------------------------------
    console.log("\n[TEST 1] Adding valid product with image & checking public /shop visibility...");
    
    const validProductPayload = {
      name: "Mission 3 Test Sneaker Pro",
      brand: "Lazaroph Admin",
      category: "Sneakers",
      price: 12500.5,
      stock: 15,
      description: "Automated verification product for Mission 3 Admin Panel",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop",
    };

    const addProductRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: "POST",
      headers: {
        "x-admin-key": ADMIN_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validProductPayload),
    });

    console.log(`POST /api/admin/products (Valid Admin): Status ${addProductRes.status}`);
    const addProductData = await addProductRes.json();

    if (addProductRes.ok && addProductData.success && addProductData.product?.id) {
      createdProductId = addProductData.product.id;
      console.log(`  ✓ Product created successfully! ID: ${createdProductId}`);
    } else {
      console.error("  ✗ FAIL: Product creation failed:", addProductData);
      testFailed = true;
    }

    // Confirm appearance on public /api/products (as a logged-out customer)
    console.log("Fetching public /api/products catalog as anonymous visitor...");
    const publicCatalogRes = await fetch(`${BASE_URL}/api/products`);
    const publicCatalogData = await publicCatalogRes.json();

    if (publicCatalogRes.ok && publicCatalogData.success) {
      const foundInPublic = publicCatalogData.products.find((p) => p.id === createdProductId);
      if (foundInPublic) {
        console.log("  ✓ PASS: Product appears in public catalog for logged-out users!");
        console.log("    Name:", foundInPublic.name);
        console.log("    Price:", foundInPublic.price);
        console.log("    Image URL:", foundInPublic.imageUrl);
      } else {
        console.error("  ✗ FAIL: Product was not found in public catalog!");
        testFailed = true;
      }
    } else {
      console.error("  ✗ FAIL: Failed to fetch public catalog:", publicCatalogData);
      testFailed = true;
    }

    // Clean up test product
    if (createdProductId) {
      console.log(`\nCleaning up test product ID: ${createdProductId}...`);
      const deleteRes = await fetch(`${BASE_URL}/api/admin/products?id=${createdProductId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": ADMIN_KEY,
        },
      });
      const deleteData = await deleteRes.json();
      if (deleteRes.ok && deleteData.success) {
        console.log("  ✓ Cleanup complete.");
      } else {
        console.log("  Note: Manual cleanup in Firestore may be needed for ID:", createdProductId);
      }
    }

    console.log("\n=================================================");
    if (!testFailed) {
      console.log("  ALL MISSION 3 VERIFICATIONS PASSED SUCCESSFULLY!");
    } else {
      console.log("  SOME VERIFICATIONS FAILED. PLEASE CHECK LOGS ABOVE.");
    }
    console.log("=================================================\n");
  } catch (error) {
    console.error("Verification suite encountered an exception:", error);
  }
}

runVerification();
