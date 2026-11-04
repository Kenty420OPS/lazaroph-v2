// Verifies the shared Lalamove coverage matcher in lib/shipping.ts.
// Run with: node scripts/verify-lalamove-cities.mjs
import { findLalamoveCity, LALAMOVE_CITIES } from "../lib/shipping.ts";

const accepted = [
  ...LALAMOVE_CITIES.map((city) => [city, city]),
  // Diacritics and "<city> City" variants must resolve to the canonical name.
  ["Dasmarinas", "Dasmariñas"],
  ["Dasmariñas City", "Dasmariñas"],
  ["Taytay City", "Taytay"],
  ["San Jose del Monte City", "San Jose del Monte"],
  ["Trece Martires City", "Trece Martires"],
  // Former/alternate names for Rodriguez.
  ["Rodriguez", "Rodriguez (Montalban)"],
  ["Montalban", "Rodriguez (Montalban)"],
];

const rejected = ["Baguio", "", "   ", "Quezon", "Cavite"];

let failures = 0;
let checks = 0;

for (const [input, expected] of accepted) {
  checks++;
  const match = findLalamoveCity(input);
  if (!match) {
    failures++;
    console.error(`FAIL "${input}": expected "${expected}", got no match`);
  } else if (match.city !== expected) {
    failures++;
    console.error(`FAIL "${input}": expected "${expected}", got "${match.city}"`);
  } else if (!match.province) {
    failures++;
    console.error(`FAIL "${input}": matched "${match.city}" without a province`);
  } else {
    console.log(`ok   "${input}" -> "${match.city}" (${match.province})`);
  }
}

for (const input of rejected) {
  checks++;
  const match = findLalamoveCity(input);
  if (match) {
    failures++;
    console.error(`FAIL "${input}": expected no match, got "${match.city}"`);
  } else {
    console.log(`ok   "${input}" -> rejected`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks} Lalamove city checks passed.`);
