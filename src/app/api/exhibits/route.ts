import { NextResponse } from "next/server";
import { enforce } from "@/lib/enforce";
import { isAccount, requireUser } from "@/lib/http-user";
import { tooFast } from "@/lib/http";
import { getLetter, listProducts } from "@/lib/records";
import { proposeCart } from "@/lib/propose";
import { listExhibits, newExhibitId, saveExhibit } from "@/lib/store";
import type { AgentSource, Proposal } from "@/lib/types";

export const maxDuration = 30;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCES = new Set<AgentSource>(["policy", "groq", "gemini"]);

function readProposal(value: unknown): Proposal | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.lines)) return null;
  const lines = record.lines.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const item = line as Record<string, unknown>;
    const sku = typeof item.sku === "string" ? item.sku : "";
    const qty = Number(item.qty);
    const because = typeof item.because === "string" ? item.because : "";
    if (!sku || !Number.isFinite(qty)) return [];
    return [{ sku, qty, because }];
  });
  const source = SOURCES.has(record.source as AgentSource)
    ? (record.source as AgentSource)
    : "policy";
  return {
    rationale:
      typeof record.rationale === "string"
        ? record.rationale
        : "The agent sent a cart.",
    lines,
    source,
    model: typeof record.model === "string" ? record.model : undefined,
    modelError:
      typeof record.modelError === "string" ? record.modelError : undefined,
  };
}

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  return NextResponse.json({ exhibits: await listExhibits(user.id) });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: unknown;
    proposal?: unknown;
    letterId?: unknown;
  };
  if (tooFast()) {
    return NextResponse.json(
      { error: "The desk is busy. Wait a moment and send the cart again." },
      { status: 429 },
    );
  }
  const letterId = typeof body.letterId === "string" ? body.letterId : "";
  const letter = letterId ? await getLetter(user.id, letterId) : null;
  if (!letter) {
    return NextResponse.json(
      { error: "Choose a letter before the agent writes a cart." },
      { status: 400 },
    );
  }
  const products = await listProducts(user.id);
  if (products.length === 0) {
    return NextResponse.json(
      { error: "Add products to the shelf before asking the agent." },
      { status: 400 },
    );
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const proposalFromClient = readProposal(body.proposal);
  const proposal =
    proposalFromClient ?? (prompt ? await proposeCart(prompt, letter, products) : null);
  if (!proposal) {
    return NextResponse.json(
      { error: "Tell the agent what to order." },
      { status: 400 },
    );
  }
  const { hash: mandateHashValue, ...mandate } = letter;
  const verdict = enforce(proposal.lines, mandate, products);
  const now = new Date().toISOString();
  const exhibit = await saveExhibit(user.id, {
    id: newExhibitId(),
    createdAt: now,
    updatedAt: now,
    status: verdict.passed ? "cleared" : "refused",
    prompt,
    mandateId: mandate.id,
    mandateHash: mandateHashValue,
    letter: mandate,
    proposal,
    verdict,
  });
  return NextResponse.json({ exhibit });
}
