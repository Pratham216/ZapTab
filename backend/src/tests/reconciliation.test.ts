import { ParsedBillSchema } from "@zaptab/shared";
import { reconcileBill, toPaise, fromPaise } from "../utils/reconciliation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

export function runReconciliationTests() {
  console.log("=========================================");
  console.log("RUNNING RECEIPT RECONCILIATION TEST SUITE");
  console.log("=========================================");

  // TEST 1: Full 10-item receipt regression test
  console.log("\n[TEST 1] Exact 10-Item Receipt Validation");
  const fullReceiptPayload = ParsedBillSchema.parse({
    restaurantName: "RESTAURANT & BAR",
    billDate: "2026-08-09",
    items: [
      { name: "CHICKEN BANJARA KEBAB", price: 699, quantity: 1, unitPrice: 699 },
      { name: "DRUMS OF HEAVEN", price: 1098, quantity: 2, unitPrice: 549 },
      { name: "FRUIT PUNCH", price: 599, quantity: 1, unitPrice: 599 },
      { name: "PACKAGED DRINKING WATER", price: 80, quantity: 2, unitPrice: 40 },
      { name: "BUDWEISER MAGNUM TOWER", price: 3500, quantity: 1, unitPrice: 3500 },
      { name: "RED BULL ENERGY DRINK", price: 325, quantity: 1, unitPrice: 325 },
      { name: "RED BULL ENERGY DRINK", price: 325, quantity: 1, unitPrice: 325 },
      { name: "RED BULL ENERGY DRINK", price: 325, quantity: 1, unitPrice: 325 },
      { name: "BUTTER NAAN", price: 436, quantity: 4, unitPrice: 109 },
      { name: "CHICKEN LABABDAR", price: 699, quantity: 1, unitPrice: 699 },
    ],
    receiptSubtotal: 8086,
    subtotal: 8086,
    cgst: 114.65,
    sgst: 114.65,
    vat: 350,
    tax: 579.3,
    serviceCharge: 808.6,
    printedBillTotal: 9473.0,
    roundedPayableTotal: 9474.0,
    grandTotal: 9473.9,
  });

  const recon1 = reconcileBill(fullReceiptPayload);
  console.log(`  · item count: ${fullReceiptPayload.items.length}`);
  console.log(`  · calculated item subtotal: ₹${recon1.calculatedItemSubtotal.toFixed(2)}`);
  console.log(`  · receipt subtotal: ₹${recon1.receiptSubtotal.toFixed(2)}`);
  console.log(`  · calculated grand total: ₹${recon1.calculatedGrandTotal.toFixed(2)}`);
  console.log(`  · printed bill total: ₹${recon1.printedBillTotal?.toFixed(2)}`);
  console.log(`  · rounded payable total: ₹${recon1.roundedPayableTotal?.toFixed(2)}`);
  console.log(`  · isItemSubtotalValid: ${recon1.isItemSubtotalValid}`);
  console.log(`  · requiresVerification: ${recon1.requiresVerification}`);

  assert(fullReceiptPayload.items.length === 10, "Should contain exactly 10 line items");
  assert(recon1.calculatedItemSubtotal === 8086, "Item subtotal should equal ₹8,086.00");
  assert(recon1.receiptSubtotal === 8086, "Receipt subtotal should equal ₹8,086.00");
  assert(recon1.calculatedGrandTotal === 9473.9, "Calculated grand total should equal ₹9,473.90");
  assert(recon1.isItemSubtotalValid === true, "isItemSubtotalValid must be TRUE for exact match");
  assert(recon1.requiresVerification === false, "requiresVerification must be FALSE when subtotal matches");
  console.log("  ✅ TEST 1 PASSED!");

  // TEST 2: Missing item failure test (9 items, missing ₹699 Kebab)
  console.log("\n[TEST 2] Missing Line Item Detection (Bad Vision Output)");
  const missingItemPayload = ParsedBillSchema.parse({
    restaurantName: "RESTAURANT & BAR",
    billDate: "2026-08-09",
    items: [
      { name: "DRUMS OF HEAVEN", price: 1098, quantity: 2, unitPrice: 549 },
      { name: "FRUIT PUNCH", price: 599, quantity: 1, unitPrice: 599 },
      { name: "PACKAGED DRINKING WATER", price: 80, quantity: 2, unitPrice: 40 },
      { name: "BUDWEISER MAGNUM TOWER", price: 3500, quantity: 1, unitPrice: 3500 },
      { name: "RED BULL ENERGY DRINK", price: 325, quantity: 1, unitPrice: 325 },
      { name: "RED BULL ENERGY DRINK", price: 325, quantity: 1, unitPrice: 325 },
      { name: "RED BULL ENERGY DRINK", price: 325, quantity: 1, unitPrice: 325 },
      { name: "BUTTER NAAN", price: 436, quantity: 4, unitPrice: 109 },
      { name: "CHICKEN LABABDAR", price: 699, quantity: 1, unitPrice: 699 },
    ],
    receiptSubtotal: 8086,
    subtotal: 8086,
    cgst: 114.65,
    sgst: 114.65,
    vat: 350,
    tax: 579.3,
    serviceCharge: 808.6,
    grandTotal: 9473.9,
  });

  const recon2 = reconcileBill(missingItemPayload);
  console.log(`  · item count: ${missingItemPayload.items.length}`);
  console.log(`  · calculated item subtotal: ₹${recon2.calculatedItemSubtotal.toFixed(2)}`);
  console.log(`  · receipt subtotal: ₹${recon2.receiptSubtotal.toFixed(2)}`);
  console.log(`  · difference: ₹${(recon2.receiptSubtotal - recon2.calculatedItemSubtotal).toFixed(2)}`);
  console.log(`  · isItemSubtotalValid: ${recon2.isItemSubtotalValid}`);
  console.log(`  · requiresVerification: ${recon2.requiresVerification}`);
  console.log(`  · warning: ${recon2.validationWarnings[0]}`);

  assert(recon2.calculatedItemSubtotal === 7387, "Calculated item subtotal should be ₹7,387.00");
  assert(recon2.receiptSubtotal === 8086, "Receipt subtotal should be ₹8,086.00");
  assert(recon2.isItemSubtotalValid === false, "isItemSubtotalValid must be FALSE when subtotal differs");
  assert(recon2.requiresVerification === true, "requiresVerification must be TRUE when item dropped");
  assert(
    recon2.validationWarnings[0].includes("699.00"),
    "Warning message must highlight exact ₹699 difference"
  );
  console.log("  ✅ TEST 2 PASSED!");

  // TEST 3: Duplicate Item Preservation
  console.log("\n[TEST 3] Duplicate Line Items Preservation");
  const redBulls = fullReceiptPayload.items.filter(
    (i) => i.name === "RED BULL ENERGY DRINK"
  );
  assert(redBulls.length === 3, "All 3 separate Red Bull lines must be preserved");
  console.log(`  · Found ${redBulls.length} distinct RED BULL ENERGY DRINK items`);
  console.log("  ✅ TEST 3 PASSED!");

  // TEST 4: Quantity x Unit Price Validation
  console.log("\n[TEST 4] Quantity × Unit Price Validation");
  const qRateMismatchPayload = ParsedBillSchema.parse({
    restaurantName: "TEST DINER",
    items: [
      { name: "SPECIAL ITEM", quantity: 4, unitPrice: 100, price: 500 }, // 4 * 100 = 400 != 500
    ],
    receiptSubtotal: 500,
    subtotal: 500,
    tax: 0,
    serviceCharge: 0,
  });
  const recon4 = reconcileBill(qRateMismatchPayload);
  console.log(`  · Qty × Rate expected: ₹400.00, Line total: ₹500.00`);
  console.log(`  · Warning generated: ${recon4.validationWarnings[0]}`);
  assert(
    recon4.validationWarnings.some((w) => w.includes("differs from 4 × ₹100.00")),
    "Must generate warning when quantity × unitPrice does not equal line total"
  );
  console.log("  ✅ TEST 4 PASSED!");

  // TEST 5: Valid receipt continues through normal bill creation
  console.log("\n[TEST 5] Valid Receipt Normal Processing Flow");
  assert(recon1.requiresVerification === false, "Valid bill should not require verification");
  assert(recon1.isItemSubtotalValid === true, "Valid bill subtotal must be valid");
  assert(recon1.validationWarnings.length === 0, "Valid bill should produce 0 warnings");
  console.log("  · Valid receipt passes without warnings or verification triggers");
  console.log("  ✅ TEST 5 PASSED!");

  // TEST 6: Tax & Charge Breakdown Validation
  console.log("\n[TEST 6] Tax / Charge Breakdown Validation");
  console.log(`  · CGST: ₹114.65, SGST: ₹114.65, VAT: ₹350.00`);
  console.log(`  · Total tax reconciled: ₹${recon1.totalTax.toFixed(2)}`);
  console.log(`  · Service charge reconciled: ₹${recon1.serviceCharge.toFixed(2)}`);
  assert(recon1.totalTax === 579.3, "Total tax must equal 114.65 + 114.65 + 350.00 = 579.30");
  assert(recon1.serviceCharge === 808.6, "Service charge must equal 808.60");
  console.log("  ✅ TEST 6 PASSED!");

  // TEST 7: Financial Rounding / Paise Reconciliation
  console.log("\n[TEST 7] Financial Rounding & Integer Paise Precision");
  const p1 = toPaise(114.65);
  const p2 = toPaise(114.65);
  const p3 = toPaise(350.0);
  const totalPaise = p1 + p2 + p3;
  const roundedRupees = fromPaise(totalPaise);
  console.log(`  · 114.65 in paise: ${p1}, 350.00 in paise: ${p3}`);
  console.log(`  · Integer paise sum: ${totalPaise} paise → ₹${roundedRupees}`);
  assert(p1 === 11465, "114.65 rupees must convert to exactly 11465 paise");
  assert(totalPaise === 57930, "Total paise must equal 57930");
  assert(roundedRupees === 579.3, "From paise must return exact float 579.3 without rounding drift");
  console.log("  ✅ TEST 7 PASSED!");

  // TEST 8: Frontend Verification State Helper
  console.log("\n[TEST 8] Frontend Verification State Trigger Test");
  function simulateFrontendState(recon: typeof recon1) {
    const itemsTotal = recon.calculatedItemSubtotal;
    const receiptSubtotal = recon.receiptSubtotal;
    const subtotalMismatch = receiptSubtotal > 0 && Math.abs(receiptSubtotal - itemsTotal) > 0.5;
    return recon.requiresVerification || !recon.isItemSubtotalValid || subtotalMismatch;
  }
  const validUiState = simulateFrontendState(recon1);
  const invalidUiState = simulateFrontendState(recon2);
  console.log(`  · Valid receipt UI verification trigger: ${validUiState} (expected false)`);
  console.log(`  · Invalid receipt UI verification trigger: ${invalidUiState} (expected true)`);
  assert(validUiState === false, "Valid receipt must NOT trigger UI verification alert");
  assert(invalidUiState === true, "Invalid receipt MUST trigger UI verification alert");
  console.log("  ✅ TEST 8 PASSED!");

  // TEST 9: TypeScript & Type Alignment Check
  console.log("\n[TEST 9] Schema & Type Safety Verification");
  const testBill = ParsedBillSchema.parse({
    restaurantName: "TYPE TEST",
    items: [{ name: "ITEM", price: 100, quantity: 1, unitPrice: 100 }],
    tax: 5,
    serviceCharge: 10,
    cgst: 2.5,
    sgst: 2.5,
    vat: 0,
    requiresVerification: false,
    isItemSubtotalValid: true,
  });
  assert(typeof testBill.cgst === "number", "cgst must be typed as number");
  assert(typeof testBill.requiresVerification === "boolean", "requiresVerification must be typed as boolean");
  console.log("  · All schema fields match Zod & TypeScript type definitions");
  console.log("  ✅ TEST 9 PASSED!");

  console.log("\n=========================================");
  console.log("ALL 9 TEST CASES PASSED SUCCESSFULLY 🎉");
  console.log("=========================================\n");
}

runReconciliationTests();
