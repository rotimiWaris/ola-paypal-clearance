import { NextResponse } from "next/server";
import { enforce } from "@/lib/enforce";
import { isAccount, requireUser } from "@/lib/http-user";
import { getLetter, listProducts } from "@/lib/records";
import { proposeCart } from "@/lib/propose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: unknown;
    letterId?: unknown;
  };
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const letterId = typeof body.letterId === "string" ? body.letterId : "";
  const letter = letterId ? await getLetter(user.id, letterId) : null;
  if (!letter) {
    return NextResponse.json(
      { error: "Choose a letter before the agent writes a cart." },
      { status: 400 },
    );
  }
  const products = await listProducts(user.id);
  const proposal = await proposeCart(prompt, letter, products);
  const verdict = enforce(proposal.lines, letter, products);
  return NextResponse.json({ prompt, proposal, verdict });
}
