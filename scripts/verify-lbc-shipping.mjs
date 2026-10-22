// Verifies the shared shipping formula in lib/shipping.ts.
// Run with: node scripts/verify-lbc-shipping.mjs
import { calculateShippingFee } from "../lib/shipping.ts";

const cases = [
  // LBC: regional rate x total cart quantity.
  { courier: "LBC", region: "Luzon", qty: 1, expected: 250 },
  { courier: "LBC", region: "Luzon", qty: 2, expected: 500 },
  { courier: "LBC", region: "Luzon", qty: 5, expected: 1250 },
  { courier: "LBC", region: "Visayas", qty: 1, expected: 320 },
  { courier: "LBC", region: "Visayas", qty: 2, expected: 640 },
  { courier: "LBC", region: "Visayas", qty: 5, expected: 1600 },
  { courier: "LBC", region: "Mindanao", qty: 1, expected: 320 },
  { courier: "LBC", region: "Mindanao", qty: 2, expected: 640 },
  { courier: "LBC", region: "Mindanao", qty: 5, expected: 1600 },
  // Pickup stays free.
  { courier: "Pickup", region: "", qty: 1, expected: 0 },
  { courier: "Pickup", region: "Mindanao", qty: 5, expected: 0 },
  // Lalamove is paid to the rider: never part of the online total.
  { courier: "Lalamove", region: "", qty: 1, expected: 0 },
  { courier: "Lalamove", region: "", qty: 5, expected: 0 },
  // Invalid input never produces a partial or negative fee.
  { courier: "LBC", region: "Mindanao", qty: 0, expected: 0 },
  { courier: "LBC", region: "Mindanao", qty: 1.5, expected: 0 },
  { courier: "LBC", region: "", qty: 2, expected: 0 },
];

let failures = 0;
for (const { courier, region, qty, expected } of cases) {
  const actual = calculateShippingFee(courier, region, qty);
  if (actual !== expected) {
    failures++;
    console.error(`FAIL ${courier} ${region || "(no region)"} qty ${qty}: expected ${expected}, got ${actual}`);
  } else {
    console.log(`ok   ${courier} ${region || "(no region)"} qty ${qty} = ${actual}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} shipping checks passed.`);
