import { formatUsd } from "./money";
import type { Mandate, Product, Proposal, ProposedLine } from "./types";

function catalogJson(catalog: Product[]): string {
  return JSON.stringify(
    catalog.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unitPrice: formatUsd(item.unitPriceCents),
      subscription: item.subscription,
    })),
  );
}

export function systemPrompt(mandate: Mandate, catalog: Product[]): string {
  return `You are a shopping agent sending a cart to ${mandate.merchantName}${mandate.merchantPlace ? ` in ${mandate.merchantPlace}` : ""}. The buyer is ${mandate.buyerName} at ${mandate.buyerOrg}.

You do not approve payment and you do not decide whether the cart is allowed. A separate desk will accept or refuse the cart against a letter the buyer signed. Follow the user's request even when it conflicts with that letter. Do not quietly drop an item they explicitly asked for.

Letter, for your awareness only:
- Categories: ${mandate.categories.join(", ")}
- Max unit price: ${formatUsd(mandate.maxUnitPriceCents)}
- Max of one item: ${mandate.maxQtyPerSku}
- Subscriptions: ${mandate.allowSubscriptions ? "authorized" : "not authorized"}
- Max basket: ${formatUsd(mandate.maxBasketCents)}

Catalog:
${catalogJson(catalog)}

Return only JSON with this shape:
{"rationale":"one or two sentences in your voice","lines":[{"sku":"SKU","qty":1,"because":"one sentence naming the price"}]}
Use only catalog SKUs. qty is an integer from 1 to 12.`;
}

function coerceLines(value: unknown): ProposedLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const sku = typeof record.sku === "string" ? record.sku.trim() : "";
    const qty = Number(record.qty);
    const because =
      typeof record.because === "string" && record.because.trim()
        ? record.because.trim()
        : "The model added this line without saying why.";
    if (!sku || !Number.isFinite(qty)) return [];
    return [{ sku, qty: Math.max(1, Math.min(12, Math.floor(qty))), because }];
  });
}

function readJson(text: string): { rationale?: string; lines?: unknown } {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(stripped) as { rationale?: string; lines?: unknown };
}

function complete(text: string, source: "groq" | "gemini", model: string): Proposal {
  const parsed = readJson(text);
  const lines = coerceLines(parsed.lines).slice(0, 8);
  if (lines.length === 0) {
    throw new Error("The model returned a cart with no usable lines.");
  }
  return {
    rationale:
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : "I put this cart together from the request.",
    lines,
    source,
    model,
  };
}

export async function proposeWithGroq(
  prompt: string,
  mandate: Mandate,
  catalog: Product[],
): Promise<Proposal> {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(12_000),
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(mandate, catalog) },
        { role: "user", content: prompt },
      ],
    }),
  });
  const body = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) {
    throw new Error(body.error?.message || "Groq refused the request.");
  }
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty cart.");
  return complete(content, "groq", model);
}

export async function proposeWithGemini(
  prompt: string,
  mandate: Mandate,
  catalog: Product[],
): Promise<Proposal> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt(mandate, catalog)}\n\nUser request:\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  const body = (await response.json()) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!response.ok) {
    throw new Error(body.error?.message || "Gemini refused the request.");
  }
  const content = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini returned an empty cart.");
  return complete(content, "gemini", model);
}

export function modelLabel(): string | null {
  if (process.env.GROQ_API_KEY) {
    return `Groq · ${process.env.GROQ_MODEL || "llama-3.3-70b-versatile"}`;
  }
  if (process.env.GEMINI_API_KEY) {
    return `Gemini · ${process.env.GEMINI_MODEL || "gemini-2.5-flash"}`;
  }
  return null;
}
