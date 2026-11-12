import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { tooFast } from "@/lib/http";
import { rehearsalCaptureId } from "@/lib/paypal";
import { getExhibit, saveExhibit } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const { id } = await context.params;
  if (tooFast()) {
    return NextResponse.json(
      { error: "The desk is busy. Wait a moment and file again." },
      { status: 429 },
    );
  }
  const exhibit = await getExhibit(user.id, id);
  if (!exhibit) {
    return NextResponse.json({ error: "No exhibit with that id." }, { status: 404 });
  }
  if (!exhibit.verdict.passed) {
    return NextResponse.json(
      { error: "A refused cart is already filed. There is nothing to settle." },
      { status: 422 },
    );
  }
  if (exhibit.status === "captured") {
    return NextResponse.json({ exhibit });
  }
  const stamp = rehearsalCaptureId();
  const saved = await saveExhibit(user.id, {
    ...exhibit,
    updatedAt: new Date().toISOString(),
    status: "rehearsal",
    paypal: {
      orderId: `REHEARSAL-ORDER-${stamp.slice("REHEARSAL-".length)}`,
      captureId: `REHEARSAL-CAPTURE-${stamp.slice("REHEARSAL-".length)}`,
      status: "REHEARSAL",
    },
  });
  return NextResponse.json({ exhibit: saved });
}
