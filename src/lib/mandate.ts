import type { Mandate } from "./types";

/**
 * Priya signed this on 11 November 2026. It stays in force through
 * 31 December 2026 so a judge can still settle a cart during the
 * PayPal hackathon judging window.
 */
export const MANDATE: Mandate = {
  id: "ltr_lumen_2026_11_11",
  buyerName: "Priya Shah",
  buyerRole: "Office manager",
  buyerOrg: "Lumen Studio",
  merchantName: "Hale & Co.",
  merchantPlace: "Oakland",
  signedAt: "2026-11-11T17:40:00.000Z",
  expiresAt: "2027-01-01T07:59:59.000Z",
  currency: "USD",
  categories: ["pantry", "cleaning", "disposables"],
  maxUnitPriceCents: 2400,
  maxBasketCents: 8000,
  maxQtyPerSku: 4,
  allowSubscriptions: false,
};
