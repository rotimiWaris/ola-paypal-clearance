import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { updateMerchant } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const body = (await request.json().catch(() => ({}))) as {
    merchantName?: unknown;
    merchantPlace?: unknown;
  };
  const merchantName =
    typeof body.merchantName === "string" ? body.merchantName.trim().slice(0, 80) : "";
  const merchantPlace =
    typeof body.merchantPlace === "string" ? body.merchantPlace.trim().slice(0, 80) : "";
  if (merchantName.length < 2) {
    return NextResponse.json(
      { error: "Enter the company this desk belongs to." },
      { status: 400 },
    );
  }
  await updateMerchant(user.id, merchantName, merchantPlace);
  return NextResponse.json({ ok: true });
}
