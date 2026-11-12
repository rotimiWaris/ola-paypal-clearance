import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { originFrom, tooFast } from "@/lib/http";
import { PayPalError, createPayPalOrder, paypalConfigured } from "@/lib/paypal";
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
      { error: "The desk is busy. Wait a moment and send the cart again." },
      { status: 429 },
    );
  }
  const exhibit = await getExhibit(user.id, id);
  if (!exhibit) {
    return NextResponse.json({ error: "No exhibit with that id." }, { status: 404 });
  }
  if (!exhibit.verdict.passed) {
    return NextResponse.json(
      {
        error:
          "This cart was refused. Clearance does not create a PayPal order for it.",
      },
      { status: 422 },
    );
  }
  if (!paypalConfigured()) {
    return NextResponse.json(
      {
        error:
          "PayPal sandbox credentials are not on this server. File a rehearsal exhibit, or set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      },
      { status: 409 },
    );
  }
  if (exhibit.paypal?.captureId && exhibit.status === "captured") {
    return NextResponse.json({ exhibit, approveUrl: exhibit.paypal.approveUrl });
  }

  try {
    const origin = originFrom(request);
    const order = await createPayPalOrder({
      exhibitId: exhibit.id,
      mandateHash: exhibit.mandateHash,
      merchantName: exhibit.letter.merchantName,
      buyerOrg: exhibit.letter.buyerOrg,
      lines: exhibit.verdict.lines,
      basketCents: exhibit.verdict.basketCents,
      returnUrl: `${origin}/approved`,
      cancelUrl: `${origin}/?cancelled=1`,
    });
    const saved = await saveExhibit(user.id, {
      ...exhibit,
      updatedAt: new Date().toISOString(),
      status: "awaiting_paypal",
      paypal: {
        orderId: order.orderId,
        approveUrl: order.approveUrl,
        status: order.status,
      },
    });
    return NextResponse.json({ exhibit: saved, approveUrl: order.approveUrl });
  } catch (error) {
    const message =
      error instanceof PayPalError ? error.message : "PayPal could not open the order.";
    const debugId = error instanceof PayPalError ? error.debugId : undefined;
    return NextResponse.json({ error: message, debugId }, { status: 502 });
  }
}
