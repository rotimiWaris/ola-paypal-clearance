import { CATALOG, productBySku } from "./catalog";
import { formatUsd } from "./money";
import type { ProposedLine } from "./types";

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
};

const ALIASES: { sku: string; words: string[] }[] = [
  { sku: "OAT-6", words: ["oat milk", "oat", "milk"] },
  { sku: "BEAN-1", words: ["espresso", "beans", "bean", "coffee"] },
  { sku: "BREW", words: ["cold brew", "concentrate", "brew"] },
  { sku: "CUP-50", words: ["cups", "cup"] },
  { sku: "SOAP", words: ["dish soap", "soap"] },
  { sku: "TOWEL", words: ["paper towel", "towels", "towel"] },
  { sku: "RESERVE", words: ["reserve", "subscription", "club"] },
  { sku: "PAN", words: ["skillet", "cast iron", "cast-iron", "pan", "wishlist"] },
];

export const RESTOCK_PROMPT = "Restock the coffee station for the week";
export const UPGRADE_PROMPT =
  "Upgrade us to the reserve plan and add the skillet from the staff wishlist";

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

function parseQty(text: string, words: string[]): number {
  const number =
    "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen";
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before = text.match(
      new RegExp(`(${number})\\s+(?:\\w+\\s+){0,3}${escaped}`),
    );
    const after = text.match(
      new RegExp(`${escaped}(?:\\s+\\w+){0,3}\\s+(${number})`),
    );
    const raw = before?.[1] ?? after?.[1];
    if (!raw) continue;
    const value = NUMBER_WORDS[raw] ?? Number(raw);
    if (value >= 1 && value <= 12) return value;
  }
  return 1;
}

function becauseFor(sku: string, qty: number, upgrade: boolean): string {
  const product = productBySku(sku);
  if (!product) return "I added this because the request named it.";
  const price = formatUsd(product.unitPriceCents);
  if (sku === "RESERVE") {
    return `You asked to upgrade the plan, so I added ${product.name} at ${price} a month.`;
  }
  if (sku === "PAN") {
    return `The staff wishlist still has the ${product.name.toLowerCase()} at ${price}.`;
  }
  if (sku === "OAT-6" && qty > 4) {
    return `You asked for ${qty} cases of oat milk, at ${price} a case.`;
  }
  if (sku === "OAT-6" && upgrade) {
    return `${qty} cases of oat milk at ${price}, sent with the upgrade.`;
  }
  if (sku === "BEAN-1") {
    return qty > 1
      ? `I doubled the espresso beans. ${price} a kilo, Lumen's usual roast.`
      : `Espresso beans are Lumen's usual roast, ${price} a kilo.`;
  }
  if (sku === "OAT-6") {
    return `Oat milk for the coffee station, ${price} a case.`;
  }
  if (sku === "SOAP") {
    return `${qty === 1 ? "A bottle" : `${qty} bottles`} of dish soap at ${price}, for the bar sink.`;
  }
  if (sku === "CUP-50") {
    return `A sleeve of compostable cups, ${price}, for the week.`;
  }
  if (upgrade) {
    return `I added ${product.name} at ${price} while upgrading the order.`;
  }
  return `${product.name} is ${price}. I read it as part of this request.`;
}

function line(sku: string, qty: number, upgrade: boolean): ProposedLine {
  return { sku, qty, because: becauseFor(sku, qty, upgrade) };
}

export function proposeLocally(prompt: string): {
  rationale: string;
  lines: ProposedLine[];
} {
  const text = prompt.toLowerCase().trim();
  const upgrade =
    /reserve|subscription|upgrade|wishlist|skillet|cast iron|cast-iron|premium|surprise/.test(
      text,
    );

  if (upgrade) {
    const oatQty = /month|six|\b6\b/.test(text) ? 6 : 2;
    return {
      rationale:
        "You asked to upgrade the plan, so I added the reserve subscription and the skillet from the staff wishlist, and I covered the beans.",
      lines: [
        line("OAT-6", oatQty, true),
        line("RESERVE", 1, true),
        line("PAN", 1, true),
        line("BEAN-1", 2, true),
      ],
    };
  }

  if (/restock|coffee station|for the week/.test(text)) {
    return {
      rationale:
        "Restocking the coffee station for the week. I stayed with the usual beans, oat milk, soap, and cups.",
      lines: [
        line("BEAN-1", 1, false),
        line("OAT-6", 1, false),
        line("SOAP", 2, false),
        line("CUP-50", 1, false),
      ],
    };
  }

  const named = ALIASES.flatMap((alias) => {
    if (!alias.words.some((word) => hasWord(text, word))) return [];
    return [line(alias.sku, parseQty(text, alias.words), false)];
  });

  const seen = new Set<string>();
  const unique = named.filter((item) => {
    if (seen.has(item.sku)) return false;
    seen.add(item.sku);
    return true;
  });

  if (unique.length > 0) {
    const names = unique
      .map((item) => productBySku(item.sku)?.name)
      .filter(Boolean)
      .join(", ");
    return {
      rationale: `I picked what the request named: ${names}.`,
      lines: unique,
    };
  }

  return {
    rationale:
      "Restocking the coffee station for the week. I stayed with the usual beans, oat milk, soap, and cups.",
    lines: [
      line("BEAN-1", 1, false),
      line("OAT-6", 1, false),
      line("SOAP", 2, false),
      line("CUP-50", 1, false),
    ],
  };
}

export function catalogForPrompt(): string {
  return JSON.stringify(
    CATALOG.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unitPrice: formatUsd(item.unitPriceCents),
      subscription: item.subscription,
    })),
  );
}
