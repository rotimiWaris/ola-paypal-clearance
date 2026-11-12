import { formatUsd } from "./money";
import type { Product, ProposedLine } from "./types";

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

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "please",
  "order",
  "buy",
  "get",
  "add",
  "some",
  "our",
  "from",
  "this",
  "that",
  "into",
  "onto",
]);

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function wordsOf(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP.has(word));
}

function parseQty(text: string, words: string[]): number {
  const number =
    "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen";
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before = text.match(
      new RegExp(`(${number})\\s+(?:\\w+\\s+){0,3}${escaped}`, "i"),
    );
    const after = text.match(
      new RegExp(`${escaped}(?:\\s+\\w+){0,3}\\s+(${number})`, "i"),
    );
    const raw = (before?.[1] ?? after?.[1] ?? "").toLowerCase();
    if (!raw) continue;
    const value = NUMBER_WORDS[raw] ?? Number(raw);
    if (value >= 1 && value <= 12) return value;
  }
  return 1;
}

export function proposeForShelf(
  prompt: string,
  catalog: Product[],
  merchantName: string,
): { rationale: string; lines: ProposedLine[] } {
  const text = prompt.toLowerCase();
  const lines: ProposedLine[] = [];
  const seen = new Set<string>();
  for (const product of catalog) {
    const words = wordsOf(product.name);
    const named =
      words.some((word) => hasWord(text, word)) ||
      hasWord(text, product.sku.toLowerCase());
    if (!named || seen.has(product.sku)) continue;
    seen.add(product.sku);
    const qty = parseQty(text, words.length > 0 ? words : [product.sku.toLowerCase()]);
    lines.push({
      sku: product.sku,
      qty,
      because: `${product.name} is ${formatUsd(product.unitPriceCents)}. The request named it.`,
    });
  }

  if (lines.length === 0) {
    return {
      rationale: `Nothing in that request matches a product ${merchantName} sells.`,
      lines: [],
    };
  }

  const names = lines
    .map((line) => catalog.find((item) => item.sku === line.sku)?.name)
    .filter(Boolean)
    .join(", ");
  return {
    rationale: `I picked what the request named from ${merchantName}'s shelf: ${names}.`,
    lines,
  };
}
