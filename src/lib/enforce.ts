import { CATALOG, productBySku } from "./catalog";
import { categoryLabel, formatUsd, formatWhen } from "./money";
import { MANDATE } from "./mandate";
import type {
  LineVerdict,
  Mandate,
  Product,
  ProposedLine,
  RuleId,
  RuleResult,
  Verdict,
  Violation,
} from "./types";

function rule(
  id: RuleId,
  label: string,
  matches: Violation[],
  passDetail: string,
): RuleResult {
  const relevant = matches.filter((item) => item.rule === id);
  return {
    id,
    label,
    passed: relevant.length === 0,
    detail: relevant[0]?.detail ?? passDetail,
  };
}

export function enforce(
  lines: ProposedLine[],
  mandate: Mandate = MANDATE,
  catalog?: Product[],
  now: Date = new Date(),
): Verdict {
  const shelf = catalog ?? CATALOG;
  const violations: Violation[] = [];
  const drafts: LineVerdict[] = [];

  if (lines.length === 0) {
    violations.push({
      rule: "nonempty",
      detail: "The agent sent an empty cart.",
    });
  }

  for (const line of lines) {
    const qty = Number.isFinite(line.qty) ? Math.floor(line.qty) : 0;
    const product = productBySku(line.sku, shelf);
    if (!product || qty < 1) {
      const detail = product
        ? `The quantity for ${line.sku} is not a positive number.`
        : `${line.sku || "An unnamed item"} is not on ${mandate.merchantName}'s shelf.`;
      violations.push({ rule: "shelf", detail, sku: line.sku });
      drafts.push({
        sku: line.sku || "unknown",
        name: line.sku || "Unknown item",
        category: "unknown",
        qty: Math.max(qty, 0),
        unitPriceCents: 0,
        lineTotalCents: 0,
        because: line.because || "The agent did not say why this was added.",
        subscription: false,
        passed: false,
        violations: [{ rule: "shelf", detail, sku: line.sku }],
      });
      continue;
    }

    const lineViolations: Violation[] = [];
    if (!mandate.categories.includes(product.category)) {
      lineViolations.push({
        rule: "category",
        sku: product.sku,
        detail: `${product.name} is ${categoryLabel(product.category).toLowerCase()}. The letter allows ${mandate.categories
          .map((category) => categoryLabel(category).toLowerCase())
          .join(", ")}.`,
      });
    }
    if (product.unitPriceCents > mandate.maxUnitPriceCents) {
      lineViolations.push({
        rule: "unit-price",
        sku: product.sku,
        detail: `${product.name} is ${formatUsd(product.unitPriceCents)}. The letter caps any single item at ${formatUsd(mandate.maxUnitPriceCents)}.`,
      });
    }
    if (qty > mandate.maxQtyPerSku) {
      lineViolations.push({
        rule: "quantity",
        sku: product.sku,
        detail: `${qty} × ${product.name}. The letter allows ${mandate.maxQtyPerSku} of any one item.`,
      });
    }
    if (product.subscription && !mandate.allowSubscriptions) {
      lineViolations.push({
        rule: "subscription",
        sku: product.sku,
        detail: `${product.name} renews on its own. The letter does not authorize a subscription.`,
      });
    }

    violations.push(...lineViolations);
    drafts.push({
      sku: product.sku,
      name: product.name,
      category: product.category,
      qty,
      unitPriceCents: product.unitPriceCents,
      lineTotalCents: product.unitPriceCents * qty,
      because: line.because,
      subscription: product.subscription,
      passed: lineViolations.length === 0,
      violations: lineViolations,
    });
  }

  const combined = new Map<string, number>();
  for (const line of drafts) {
    if (line.category === "unknown") continue;
    combined.set(line.sku, (combined.get(line.sku) ?? 0) + line.qty);
  }
  for (const [sku, qty] of combined) {
    const already = drafts.some((line) =>
      line.violations.some(
        (item) => item.rule === "quantity" && item.sku === sku,
      ),
    );
    if (qty > mandate.maxQtyPerSku && !already) {
      const name = drafts.find((line) => line.sku === sku)?.name ?? sku;
      const detail = `${name} totals ${qty} across the cart. The letter allows ${mandate.maxQtyPerSku} of any one item.`;
      const violation = { rule: "quantity" as const, sku, detail };
      violations.push(violation);
      for (const line of drafts) {
        if (line.sku === sku) {
          line.passed = false;
          line.violations.push(violation);
        }
      }
    }
  }

  const basketCents = drafts.reduce(
    (sum, line) => sum + line.lineTotalCents,
    0,
  );
  if (lines.length > 0 && basketCents > mandate.maxBasketCents) {
    violations.push({
      rule: "basket",
      detail: `The cart totals ${formatUsd(basketCents)}. The letter caps a basket at ${formatUsd(mandate.maxBasketCents)}.`,
    });
  }
  if (now.getTime() > new Date(mandate.expiresAt).getTime()) {
    violations.push({
      rule: "expiry",
      detail: `This letter expired ${formatWhen(mandate.expiresAt)}.`,
    });
  }

  const categoryDetail = `Every item is ${mandate.categories
    .map((category) => categoryLabel(category).toLowerCase())
    .join(", ")}.`;

  const rules: RuleResult[] = [
    rule(
      "shelf",
      `On ${mandate.merchantName}'s shelf`,
      violations,
      `Every line is a product ${mandate.merchantName} sells.`,
    ),
    rule("category", "Allowed categories", violations, categoryDetail),
    rule(
      "unit-price",
      `Unit price at most ${formatUsd(mandate.maxUnitPriceCents)}`,
      violations,
      `Nothing is priced above ${formatUsd(mandate.maxUnitPriceCents)}.`,
    ),
    rule(
      "quantity",
      `At most ${mandate.maxQtyPerSku} of one item`,
      violations,
      `No item exceeds ${mandate.maxQtyPerSku}.`,
    ),
    rule(
      "subscription",
      mandate.allowSubscriptions ? "Subscriptions" : "No subscriptions",
      violations,
      mandate.allowSubscriptions
        ? "The letter authorizes subscriptions."
        : "Nothing in the cart renews.",
    ),
    rule(
      "basket",
      `Basket at most ${formatUsd(mandate.maxBasketCents)}`,
      violations,
      `${formatUsd(basketCents)} of ${formatUsd(mandate.maxBasketCents)}.`,
    ),
    rule(
      "expiry",
      "Letter still in force",
      violations,
      `In force through ${formatWhen(mandate.expiresAt)}.`,
    ),
    rule("nonempty", "Cart has items", violations, "The agent sent a cart."),
  ];

  const passed =
    lines.length > 0 &&
    rules.every((item) => item.passed) &&
    drafts.every((line) => line.passed);

  return { passed, lines: drafts, basketCents, rules };
}
