async function verifyEndpoint() {
  console.log("🔍 Verifying http://localhost:3000/api/products...");
  try {
    const resApi = await fetch("http://localhost:3000/api/products");
    console.log("HTTP Status /api/products:", resApi.status);
    const data = await resApi.json();
    console.log("API Response:");
    console.log(JSON.stringify(data, null, 2));

    if (!data.success || !Array.isArray(data.products)) {
      throw new Error("/api/products response format invalid!");
    }

    console.log("\n🔍 Verifying http://localhost:3000/shop HTML rendering...");
    const resShop = await fetch("http://localhost:3000/shop");
    console.log("HTTP Status /shop:", resShop.status);
    const html = await resShop.text();
    
    if (html.includes("LAZAROPH") && html.includes("Authentic Sportswear")) {
      console.log("✅ Shop page HTML contains valid LAZAROPH header & brand elements!");
    } else {
      throw new Error("Shop HTML missing expected brand content!");
    }

    console.log("\n🎉 ALL LOCAL ENDPOINT & FIRESTORE INTEGRATION TESTS PASSED PERFECTLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Verification error:", err);
    process.exit(1);
  }
}

verifyEndpoint();
