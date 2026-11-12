import { proposeWithGemini, proposeWithGroq } from "./llm";
import { proposeForShelf } from "./propose-shelf";
import type { Mandate, Product, Proposal } from "./types";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "The model request failed.";
}

export async function proposeCart(
  prompt: string,
  mandate: Mandate,
  catalog: Product[],
): Promise<Proposal> {
  const trimmed = prompt.trim();
  const local = () => {
    const drafted = proposeForShelf(trimmed, catalog, mandate.merchantName);
    return { ...drafted, source: "policy" as const };
  };

  if (!trimmed) return local();
  if (process.env.GROQ_API_KEY) {
    try {
      return await proposeWithGroq(trimmed, mandate, catalog);
    } catch (error) {
      return { ...local(), modelError: messageOf(error) };
    }
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      return await proposeWithGemini(trimmed, mandate, catalog);
    } catch (error) {
      return { ...local(), modelError: messageOf(error) };
    }
  }
  return local();
}
