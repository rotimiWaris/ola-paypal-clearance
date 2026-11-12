import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enforce } from "./enforce";
import { mandateHash } from "./hash";
import { MANDATE } from "./mandate";
import { proposeForShelf } from "./propose-shelf";
import { RESTOCK_PROMPT, UPGRADE_PROMPT, proposeLocally } from "./policy";
import type { Product } from "./types";

const now = new Date("2026-11-12T12:00:00.000Z");

describe("mandate hash", () => {
  it("is stable", () => {
    assert.equal(mandateHash(MANDATE), mandateHash({ ...MANDATE }));
    assert.equal(mandateHash(MANDATE).length, 64);
  });
});

describe("desk decisions", () => {
  it("clears a coffee-station restock", () => {
    const proposal = proposeLocally(RESTOCK_PROMPT);
    const verdict = enforce(proposal.lines, MANDATE, undefined, now);
    assert.equal(verdict.passed, true);
    assert.equal(verdict.basketCents, 7200);
    assert.equal(
      verdict.rules.every((rule) => rule.passed),
      true,
    );
  });

  it("refuses the reserve-plan upgrade on several rules at once", () => {
    const proposal = proposeLocally(UPGRADE_PROMPT);
    const verdict = enforce(proposal.lines, MANDATE, undefined, now);
    assert.equal(verdict.passed, false);
    const failed = verdict.rules.filter((rule) => !rule.passed).map((rule) => rule.id);
    assert.deepEqual(failed.sort(), [
      "basket",
      "category",
      "subscription",
      "unit-price",
    ]);
  });

  it("refuses six oat milks on quantity and basket", () => {
    const proposal = proposeLocally("six oat milks");
    const verdict = enforce(proposal.lines, MANDATE, undefined, now);
    assert.equal(verdict.passed, false);
    assert.deepEqual(
      verdict.rules
        .filter((rule) => !rule.passed)
        .map((rule) => rule.id)
        .sort(),
      ["basket", "quantity"],
    );
    assert.equal(proposal.lines[0]?.qty, 6);
  });

  it("prices lines from the shelf, ignoring any client-supplied price", () => {
    const verdict = enforce(
      [{ sku: "SOAP", qty: 2, because: "Sink." }],
      MANDATE,
      undefined,
      now,
    );
    assert.equal(verdict.passed, true);
    assert.equal(verdict.lines[0]?.unitPriceCents, 900);
    assert.equal(verdict.lines[0]?.lineTotalCents, 1800);
  });

  it("flags a unit price, a subscription, a basket, and an expired letter", () => {
    const catalog: Product[] = [
      {
        sku: "LUX",
        name: "Luxury syrup",
        category: "pantry",
        unitPriceCents: 2500,
        subscription: false,
        note: "",
      },
      {
        sku: "SUB",
        name: "Milk club",
        category: "pantry",
        unitPriceCents: 500,
        subscription: true,
        note: "",
      },
      {
        sku: "SOAP",
        name: "Dish soap, 1 L",
        category: "cleaning",
        unitPriceCents: 900,
        subscription: false,
        note: "",
      },
    ];
    const pricey = enforce(
      [{ sku: "LUX", qty: 1, because: "A nicer syrup." }],
      MANDATE,
      catalog,
      now,
    );
    assert.deepEqual(
      pricey.rules.filter((rule) => !rule.passed).map((rule) => rule.id),
      ["unit-price"],
    );

    const sub = enforce(
      [{ sku: "SUB", qty: 1, because: "Monthly milk." }],
      MANDATE,
      catalog,
      now,
    );
    assert.equal(
      sub.rules.find((rule) => rule.id === "subscription")?.passed,
      false,
    );

    const over = enforce(
      [
        { sku: "TOWEL", qty: 4, because: "Closet." },
        { sku: "CUP-50", qty: 1, because: "Cups." },
        { sku: "SOAP", qty: 1, because: "Sink." },
      ],
      MANDATE,
      undefined,
      now,
    );
    assert.equal(over.basketCents, 8700);
    assert.deepEqual(
      over.rules.filter((rule) => !rule.passed).map((rule) => rule.id),
      ["basket"],
    );

    const expired = enforce(
      [{ sku: "SOAP", qty: 1, because: "Sink." }],
      MANDATE,
      undefined,
      new Date("2027-02-01T00:00:00.000Z"),
    );
    assert.equal(expired.rules.find((rule) => rule.id === "expiry")?.passed, false);
  });

  it("refuses an empty cart and an unknown sku", () => {
    const empty = enforce([], MANDATE, undefined, now);
    assert.equal(empty.passed, false);
    assert.equal(empty.rules.find((rule) => rule.id === "nonempty")?.passed, false);

    const unknown = enforce(
      [{ sku: "NOPE", qty: 1, because: "Trust me." }],
      MANDATE,
      undefined,
      now,
    );
    assert.equal(unknown.rules.find((rule) => rule.id === "shelf")?.passed, false);
    assert.equal(unknown.basketCents, 0);
  });

  it("matches a merchant's own shelf by the words in the request", () => {
    const catalog: Product[] = [
      {
        sku: "BOLT",
        name: "Brass bolt, 20 pack",
        category: "hardware",
        unitPriceCents: 1200,
        subscription: false,
        note: "",
      },
      {
        sku: "CLUB",
        name: "Tool club, monthly",
        category: "hardware",
        unitPriceCents: 4000,
        subscription: true,
        note: "",
      },
    ];
    const proposal = proposeForShelf("six brass bolts", catalog, "North Shop");
    assert.equal(proposal.lines[0]?.sku, "BOLT");
    assert.equal(proposal.lines[0]?.qty, 6);
    const verdict = enforce(proposal.lines, {
      ...MANDATE,
      merchantName: "North Shop",
      categories: ["hardware"],
      maxQtyPerSku: 4,
      maxBasketCents: 8000,
    }, catalog, now);
    assert.equal(verdict.passed, false);
    assert.deepEqual(
      verdict.rules.filter((rule) => !rule.passed).map((rule) => rule.id).sort(),
      ["quantity"],
    );
  });
});
