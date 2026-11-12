import { createHash } from "node:crypto";
import type { Mandate } from "./types";

export function mandateHash(mandate: Mandate): string {
  const canonical = JSON.stringify({
    id: mandate.id,
    buyerOrg: mandate.buyerOrg,
    merchantName: mandate.merchantName,
    signedAt: mandate.signedAt,
    expiresAt: mandate.expiresAt,
    currency: mandate.currency,
    categories: [...mandate.categories].sort(),
    maxUnitPriceCents: mandate.maxUnitPriceCents,
    maxBasketCents: mandate.maxBasketCents,
    maxQtyPerSku: mandate.maxQtyPerSku,
    allowSubscriptions: mandate.allowSubscriptions,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
