import {
  calculatePersonShare,
  calculateRoomShares,
  type BillForShare,
  type SelectionsMap,
} from "@zaptab/shared";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

function runRoomSettlementTests() {
  console.log("=========================================");
  console.log("RUNNING ROOM SETTLEMENT TEST SUITE");
  console.log("=========================================\n");

  // Sample 10-item receipt with broken down tax fields
  const sampleBill: BillForShare = {
    items: [
      { id: "item-1", price: 699, quantity: 1 },
      { id: "item-2", price: 1098, quantity: 2 },
      { id: "item-3", price: 599, quantity: 1 },
      { id: "item-4", price: 80, quantity: 2 },
      { id: "item-5", price: 3500, quantity: 1 },
      { id: "item-6", price: 325, quantity: 1 },
      { id: "item-7", price: 325, quantity: 1 },
      { id: "item-8", price: 325, quantity: 1 },
      { id: "item-9", price: 436, quantity: 4 },
      { id: "item-10", price: 699, quantity: 1 },
    ],
    subtotal: 8086.0,
    cgst: 114.65,
    sgst: 114.65,
    vat: 350.0,
    tax: 350.0, // legacy tax field on bill object
    serviceCharge: 808.6,
    grandTotal: 9473.9,
  };

  // ----------------------------------------------------
  // TEST 1: 100% Claim Test (Single Participant owns all items)
  // ----------------------------------------------------
  console.log("[TEST 1] Single Participant 100% Item Claim");
  const selections100: SelectionsMap = {
    "item-1": { p1: 1 },
    "item-2": { p1: 2 },
    "item-3": { p1: 1 },
    "item-4": { p1: 2 },
    "item-5": { p1: 1 },
    "item-6": { p1: 1 },
    "item-7": { p1: 1 },
    "item-8": { p1: 1 },
    "item-9": { p1: 4 },
    "item-10": { p1: 1 },
  };

  const share100 = calculatePersonShare(sampleBill, selections100, "p1");
  console.log(`  · Items Total: ₹${share100.itemsTotal.toFixed(2)}`);
  console.log(`  · CGST: ₹${share100.cgst.toFixed(2)}`);
  console.log(`  · SGST: ₹${share100.sgst.toFixed(2)}`);
  console.log(`  · VAT: ₹${share100.vat.toFixed(2)}`);
  console.log(`  · Total Tax: ₹${share100.tax.toFixed(2)}`);
  console.log(`  · Service Charge: ₹${share100.serviceCharge.toFixed(2)}`);
  console.log(`  · Participant Final Share: ₹${share100.total.toFixed(2)}`);

  assert(share100.itemsTotal === 8086.0, "Items total should be 8086.00");
  assert(share100.cgst === 114.65, "CGST should be 114.65");
  assert(share100.sgst === 114.65, "SGST should be 114.65");
  assert(share100.vat === 350.0, "VAT should be 350.00");
  assert(share100.tax === 579.3, "Total Tax should be 579.30 (114.65+114.65+350)");
  assert(share100.serviceCharge === 808.6, "Service charge should be 808.60");
  assert(share100.total === 9473.9, "Final share should be exactly 9473.90");
  console.log("  ✅ TEST 1 PASSED!\n");

  // ----------------------------------------------------
  // TEST 2: 2 Participants Claiming Different Amounts
  // ----------------------------------------------------
  console.log("[TEST 2] 2 Participants Claiming Different Item Amounts");
  const selections2: SelectionsMap = {
    "item-1": { p1: 1 },
    "item-2": { p1: 2 },
    "item-3": { p1: 1 },
    "item-4": { p1: 2 },
    "item-5": { p2: 1 }, // P2 claimed Budweiser tower ₹3500
    "item-6": { p2: 1 },
    "item-7": { p2: 1 },
    "item-8": { p2: 1 },
    "item-9": { p1: 4 },
    "item-10": { p1: 1 },
  };

  const roomShares2 = calculateRoomShares(sampleBill, selections2, ["p1", "p2"]);
  const sum2 = Math.round((roomShares2.p1.total + roomShares2.p2.total) * 100) / 100;
  console.log(`  · P1 Share: ₹${roomShares2.p1.total.toFixed(2)}`);
  console.log(`  · P2 Share: ₹${roomShares2.p2.total.toFixed(2)}`);
  console.log(`  · Sum of Shares: ₹${sum2.toFixed(2)} vs Expected: ₹9473.90`);
  assert(sum2 === 9473.9, "Sum of participant shares must equal 9473.90");
  console.log("  ✅ TEST 2 PASSED!\n");

  // ----------------------------------------------------
  // TEST 3: 3 Participants Claiming Shared Item Quantities
  // ----------------------------------------------------
  console.log("[TEST 3] 3 Participants Sharing Multi-Quantity Dishes");
  const selections3: SelectionsMap = {
    "item-1": { p1: 1 },
    "item-2": { p1: 1, p2: 1 }, // 2x Drums of Heaven split 1 each
    "item-3": { p2: 1 },
    "item-4": { p2: 1, p3: 1 }, // 2x Water split 1 each
    "item-5": { p3: 1 }, // Budweiser tower
    "item-6": { p1: 1 },
    "item-7": { p2: 1 },
    "item-8": { p3: 1 },
    "item-9": { p1: 2, p2: 2 }, // 4x Butter Naan split 2 each
    "item-10": { p3: 1 },
  };

  const roomShares3 = calculateRoomShares(sampleBill, selections3, ["p1", "p2", "p3"]);
  const sum3 =
    Math.round(
      (roomShares3.p1.total + roomShares3.p2.total + roomShares3.p3.total) * 100
    ) / 100;
  console.log(`  · P1 Share: ₹${roomShares3.p1.total.toFixed(2)}`);
  console.log(`  · P2 Share: ₹${roomShares3.p2.total.toFixed(2)}`);
  console.log(`  · P3 Share: ₹${roomShares3.p3.total.toFixed(2)}`);
  console.log(`  · Sum of Shares: ₹${sum3.toFixed(2)} vs Expected: ₹9473.90`);
  assert(sum3 === 9473.9, "Sum of participant shares must equal 9473.90");
  console.log("  ✅ TEST 3 PASSED!\n");

  // ----------------------------------------------------
  // TEST 4: 4 Participants with Duplicate Item Names (Red Bull Energy Drink)
  // ----------------------------------------------------
  console.log("[TEST 4] 4 Participants Claiming Duplicate Line Items");
  const selections4: SelectionsMap = {
    "item-1": { p1: 1 },
    "item-2": { p2: 2 },
    "item-3": { p3: 1 },
    "item-4": { p4: 2 },
    "item-5": { p1: 1 },
    "item-6": { p1: 1 }, // 1st Red Bull
    "item-7": { p2: 1 }, // 2nd Red Bull
    "item-8": { p3: 1 }, // 3rd Red Bull
    "item-9": { p4: 4 },
    "item-10": { p4: 1 },
  };

  const roomShares4 = calculateRoomShares(sampleBill, selections4, [
    "p1",
    "p2",
    "p3",
    "p4",
  ]);
  const sum4 =
    Math.round(
      (roomShares4.p1.total +
        roomShares4.p2.total +
        roomShares4.p3.total +
        roomShares4.p4.total) *
        100
    ) / 100;
  console.log(`  · P1 Share: ₹${roomShares4.p1.total.toFixed(2)}`);
  console.log(`  · P2 Share: ₹${roomShares4.p2.total.toFixed(2)}`);
  console.log(`  · P3 Share: ₹${roomShares4.p3.total.toFixed(2)}`);
  console.log(`  · P4 Share: ₹${roomShares4.p4.total.toFixed(2)}`);
  console.log(`  · Sum of Shares: ₹${sum4.toFixed(2)} vs Expected: ₹9473.90`);
  assert(sum4 === 9473.9, "Sum of 4 participant shares must equal 9473.90");
  console.log("  ✅ TEST 4 PASSED!\n");

  // ----------------------------------------------------
  // TEST 5: 5 Participants with Rounding Edge Cases (Deterministic Paise Adjustment)
  // ----------------------------------------------------
  console.log("[TEST 5] 5 Participants Rounding Invariant Check");
  const selections5: SelectionsMap = {
    "item-1": { p1: 1 },
    "item-2": { p2: 2 },
    "item-3": { p3: 1 },
    "item-4": { p4: 2 },
    "item-5": { p5: 1 },
    "item-6": { p1: 1 },
    "item-7": { p2: 1 },
    "item-8": { p3: 1 },
    "item-9": { p4: 4 },
    "item-10": { p5: 1 },
  };

  const roomShares5 = calculateRoomShares(sampleBill, selections5, [
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
  ]);
  const sum5 =
    Math.round(
      (roomShares5.p1.total +
        roomShares5.p2.total +
        roomShares5.p3.total +
        roomShares5.p4.total +
        roomShares5.p5.total) *
        100
    ) / 100;
  console.log(`  · Sum of 5 Shares: ₹${sum5.toFixed(2)} vs Expected: ₹9473.90`);
  assert(sum5 === 9473.9, "Sum of 5 participant shares must equal 9473.90");
  console.log("  ✅ TEST 5 PASSED!\n");

  // ----------------------------------------------------
  // TEST 6: Legacy Bill Fallback (No CGST/SGST/VAT)
  // ----------------------------------------------------
  console.log("[TEST 6] Legacy Bill Fallback (Combined Single Tax)");
  const legacyBill: BillForShare = {
    items: [
      { id: "item-1", price: 1000, quantity: 1 },
      { id: "item-2", price: 2000, quantity: 1 },
    ],
    subtotal: 3000,
    tax: 300,
    serviceCharge: 300,
    grandTotal: 3600,
  };

  const legacySelections: SelectionsMap = {
    "item-1": { p1: 1 },
    "item-2": { p2: 1 },
  };

  const legacyShares = calculateRoomShares(legacyBill, legacySelections, ["p1", "p2"]);
  const legacySum = Math.round((legacyShares.p1.total + legacyShares.p2.total) * 100) / 100;
  console.log(`  · Legacy P1 Share: ₹${legacyShares.p1.total.toFixed(2)} (expected ₹1200)`);
  console.log(`  · Legacy P2 Share: ₹${legacyShares.p2.total.toFixed(2)} (expected ₹2400)`);
  console.log(`  · Sum of Shares: ₹${legacySum.toFixed(2)} vs Expected: ₹3600.00`);
  assert(legacyShares.p1.total === 1200.0, "Legacy P1 total should be 1200");
  assert(legacyShares.p2.total === 2400.0, "Legacy P2 total should be 2400");
  assert(legacySum === 3600.0, "Legacy sum must equal 3600.00");
  console.log("  ✅ TEST 6 PASSED!\n");

  console.log("=========================================");
  console.log("ALL ROOM SETTLEMENT TESTS PASSED 🎉");
  console.log("=========================================");
}

runRoomSettlementTests();
