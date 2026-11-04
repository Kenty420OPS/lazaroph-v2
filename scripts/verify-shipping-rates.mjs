// Verifies editable LBC rates, validation and the stale-fee grace window.
// Run with: node scripts/verify-shipping-rates.mjs
import {
  calculateShippingFee,
  decideShippingFee,
  parseRateValue,
  parseRateInput,
  validateShippingRatesInput,
  normalizeShippingRates,
  resolveShippingRatesFromSettings,
  DEFAULT_SHIPPING_RATES,
  RATE_GRACE_MS,
  SHIPPING_RATE_CHANGED_MESSAGE,
} from "../lib/shipping.ts";

let failures = 0;
let checks = 0;

function check(name, actual, expected) {
  checks++;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures++;
    console.error(`FAIL ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

function expectOk(name, decision, fee, lbcRate, graceApplied) {
  checks++;
  if (
    decision?.status !== "ok" ||
    decision.fee !== fee ||
    decision.lbcRate !== lbcRate ||
    decision.graceApplied !== graceApplied
  ) {
    failures++;
    console.error(
      `FAIL ${name}: expected ok fee=${fee} rate=${lbcRate} grace=${graceApplied}, got ${JSON.stringify(decision)}`
    );
  } else {
    console.log(`ok   ${name}`);
  }
}

function expectConflict(name, decision, shippingFee) {
  checks++;
  if (
    decision?.status !== "conflict" ||
    decision.shippingFee !== shippingFee ||
    decision.message !== SHIPPING_RATE_CHANGED_MESSAGE
  ) {
    failures++;
    console.error(
      `FAIL ${name}: expected conflict fee=${shippingFee}, got ${JSON.stringify(decision)}`
    );
  } else {
    console.log(`ok   ${name}`);
  }
}

const custom = { Luzon: 300, Visayas: 350, Mindanao: 350 };
const now = Date.parse("2026-11-05T12:00:00.000Z");
const recent = new Date(now - 10 * 60 * 1000);
const exactly30 = new Date(now - RATE_GRACE_MS);
const expired = new Date(now - RATE_GRACE_MS - 1);

// Defaults and custom rates.
check("default Luzon x2", calculateShippingFee("LBC", "Luzon", 2), 500);
check("default Visayas x2", calculateShippingFee("LBC", "Visayas", 2), 640);
check("default Mindanao x3", calculateShippingFee("LBC", "Mindanao", 3), 960);
check("custom Luzon x2", calculateShippingFee("LBC", "Luzon", 2, custom), 600);
check("custom Visayas x3", calculateShippingFee("LBC", "Visayas", 3, custom), 1050);
check("custom Mindanao x3", calculateShippingFee("LBC", "Mindanao", 3, custom), 1050);
check("custom zero", calculateShippingFee("LBC", "Luzon", 2, { Luzon: 0, Visayas: 0, Mindanao: 0 }), 0);
check("custom max", calculateShippingFee("LBC", "Luzon", 2, { ...DEFAULT_SHIPPING_RATES, Luzon: 5000 }), 10000);
check("Pickup always zero", calculateShippingFee("Pickup", "Mindanao", 5, custom), 0);
check("Lalamove always zero", calculateShippingFee("Lalamove", "Luzon", 5, custom), 0);
check("invalid qty zero", calculateShippingFee("LBC", "Luzon", 1.5, custom), 0);

// Server-side numeric validation.
check("parse 0", parseRateValue(0), 0);
check("parse 250", parseRateValue(250), 250);
check("parse 5000", parseRateValue(5000), 5000);
check("reject -1", parseRateValue(-1), null);
check("reject decimal", parseRateValue(1.5), null);
check("reject numeric string", parseRateValue("250"), null);
check("reject NaN", parseRateValue(NaN), null);
check("reject Infinity", parseRateValue(Infinity), null);
check("reject 5001", parseRateValue(5001), null);
check("reject null", parseRateValue(null), null);
check("reject boolean", parseRateValue(true), null);

// Client input parsing.
check("input 0", parseRateInput("0"), 0);
check("input 250", parseRateInput("250"), 250);
check("input padded", parseRateInput(" 250 "), 250);
check("input empty", parseRateInput(""), null);
check("input decimal", parseRateInput("1.5"), null);
check("input negative", parseRateInput("-1"), null);
check("input letters", parseRateInput("abc"), null);
check("input too high", parseRateInput("5001"), null);

// Request body validation.
check("validate ok", validateShippingRatesInput({ luzon: 250, visayasMindanao: 320 }), {
  ok: true,
  value: { luzon: 250, visayasMindanao: 320 },
});
check("validate missing", validateShippingRatesInput({ luzon: 250 }).ok, false);
check("validate string", validateShippingRatesInput({ luzon: "250", visayasMindanao: 320 }).ok, false);
check("validate null body", validateShippingRatesInput(null).ok, false);

// Normalization.
check("normalize invalid", normalizeShippingRates({ Luzon: "x", Visayas: 400 }), {
  Luzon: DEFAULT_SHIPPING_RATES.Luzon,
  Visayas: 400,
  Mindanao: DEFAULT_SHIPPING_RATES.Mindanao,
});
check("normalize empty", normalizeShippingRates(null), DEFAULT_SHIPPING_RATES);

// Settings resolution.
const missing = resolveShippingRatesFromSettings(null);
check("missing doc rates", missing.rates, DEFAULT_SHIPPING_RATES);
check("missing doc source", missing.source, "default");
check("missing doc previous", missing.previousRates, null);

const partial = resolveShippingRatesFromSettings({ lbcLuzon: 400 });
check("partial field default", partial.rates, {
  Luzon: 400,
  Visayas: DEFAULT_SHIPPING_RATES.Visayas,
  Mindanao: DEFAULT_SHIPPING_RATES.Mindanao,
});
check("partial source", partial.source, "firestore");

const stored = resolveShippingRatesFromSettings({
  lbcLuzon: 300,
  lbcVisayasMindanao: 350,
  previousLbcLuzon: 250,
  previousLbcVisayasMindanao: 320,
  ratesChangedAt: recent.toISOString(),
  updatedAt: recent.toISOString(),
  updatedBy: "uid-1",
  updatedByEmail: "admin@example.com",
});
check("stored rates", stored.rates, custom);
check("stored previous", stored.previousRates, { Luzon: 250, Visayas: 320, Mindanao: 320 });
check("stored source", stored.source, "firestore");

const noPrevious = resolveShippingRatesFromSettings({
  lbcLuzon: 300,
  lbcVisayasMindanao: 350,
  ratesChangedAt: recent.toISOString(),
});
check("missing previous disables grace", noPrevious.previousRates, null);
check("missing previous clears date", noPrevious.ratesChangedAt, null);

// Grace decision.
expectOk(
  "pickup ignores expected",
  decideShippingFee({
    courier: "Pickup",
    region: "Mindanao",
    totalQuantity: 5,
    expectedFee: 999,
    currentRates: custom,
    previousRates: null,
    ratesChangedAt: null,
    now,
  }),
  0,
  null,
  false
);
expectOk(
  "lalamove ignores expected",
  decideShippingFee({
    courier: "Lalamove",
    region: "Luzon",
    totalQuantity: 5,
    expectedFee: 999,
    currentRates: custom,
    previousRates: null,
    ratesChangedAt: null,
    now,
  }),
  0,
  null,
  false
);
expectOk(
  "current fee matches",
  decideShippingFee({
    courier: "LBC",
    region: "Luzon",
    totalQuantity: 2,
    expectedFee: 600,
    currentRates: custom,
    previousRates: { Luzon: 250, Visayas: 320, Mindanao: 320 },
    ratesChangedAt: recent,
    now,
  }),
  600,
  300,
  false
);
expectOk(
  "missing expected uses current",
  decideShippingFee({
    courier: "LBC",
    region: "Luzon",
    totalQuantity: 2,
    expectedFee: null,
    currentRates: custom,
    previousRates: null,
    ratesChangedAt: null,
    now,
  }),
  600,
  300,
  false
);
expectOk(
  "previous fee inside window",
  decideShippingFee({
    courier: "LBC",
    region: "Luzon",
    totalQuantity: 2,
    expectedFee: 500,
    currentRates: custom,
    previousRates: { Luzon: 250, Visayas: 320, Mindanao: 320 },
    ratesChangedAt: recent,
    now,
  }),
  500,
  250,
  true
);
expectOk(
  "previous fee exactly 30 minutes",
  decideShippingFee({
    courier: "LBC",
    region: "Visayas",
    totalQuantity: 3,
    expectedFee: 960,
    currentRates: custom,
    previousRates: { Luzon: 250, Visayas: 320, Mindanao: 320 },
    ratesChangedAt: exactly30,
    now,
  }),
  960,
  320,
  true
);
expectConflict(
  "previous fee after 30 minutes",
  decideShippingFee({
    courier: "LBC",
    region: "Luzon",
    totalQuantity: 2,
    expectedFee: 500,
    currentRates: custom,
    previousRates: { Luzon: 250, Visayas: 320, Mindanao: 320 },
    ratesChangedAt: expired,
    now,
  }),
  600
);
expectConflict(
  "fee matches neither",
  decideShippingFee({
    courier: "LBC",
    region: "Luzon",
    totalQuantity: 2,
    expectedFee: 111,
    currentRates: custom,
    previousRates: { Luzon: 250, Visayas: 320, Mindanao: 320 },
    ratesChangedAt: recent,
    now,
  }),
  600
);
expectConflict(
  "missing previous",
  decideShippingFee({
    courier: "LBC",
    region: "Luzon",
    totalQuantity: 2,
    expectedFee: 500,
    currentRates: custom,
    previousRates: null,
    ratesChangedAt: null,
    now,
  }),
  600
);
expectConflict(
  "future changedAt disables grace",
  decideShippingFee({
    courier: "LBC",
    region: "Luzon",
    totalQuantity: 2,
    expectedFee: 500,
    currentRates: custom,
    previousRates: { Luzon: 250, Visayas: 320, Mindanao: 320 },
    ratesChangedAt: new Date(now + 60 * 1000),
    now,
  }),
  600
);

if (failures > 0) {
  console.error(`\n${failures} of ${checks} check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks} shipping-rate checks passed.`);
