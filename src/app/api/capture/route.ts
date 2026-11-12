import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { tooFast } from "@/lib/http";
import { PayPalError, capturePayPalOrder } from "@/lib/paypal";
import { findExhibitByOrder, getExhibit, saveExhibit } from "@/lib/store";
import type { Exhibit } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function settle(userId: string, exhibit: Exhibit) {
  if (exhibit.status === "captured" && exhibit.paypal?.captureId) {
    return exhibit;
  }
  if (!exhibit.paypal?.orderId || exhibit.status === "rehearsal") {
    throw new PayPalError("This exhibit has no PayPal order to capture.");
  }
  const captured = await capturePayPalOrder(exhibit.paypal.orderId);
  return saveExhibit(userId, {
    ...exhibit,
    updatedAt: new Date().toISOString(),
    status: "captured",
    paypal: {
      ...exhibit.paypal,
      captureId: captured.captureId,
      status: captured.status,
    },
  });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const body = (await request.json().catch(() => ({}))) as {
    orderId?: unknown;
    exhibitId?: unknown;
  };
  if (tooFast()) {
    return NextResponse.json(
      { error: "The desk is busy. Wait a moment and try the capture again." },
      { status: 429 },
    );
  }
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const exhibitId = typeof body.exhibitId === "string" ? body.exhibitId : "";
  const exhibit = orderId
    ? await findExhibitByOrder(user.id, orderId)
    : exhibitId
      ? await getExhibit(user.id, exhibitId)
      : undefined;
  if (!exhibit) {
    return NextResponse.json(
      {
        error:
          "Clearance has no exhibit for that PayPal order. The cart may have been filed on another account.",
      },
      { status: 404 },
    );
  }
  try {
    const saved = await settle(user.id, exhibit);
    return NextResponse.json({ exhibit: saved });
  } catch (error) {
    const message =
      error instanceof PayPalError
        ? error.message
        : "PayPal could not capture the order.";
    const debugId = error instanceof PayPalError ? error.debugId : undefined;
    return NextResponse.json(
      { error: message, debugId, exhibitId: exhibit.id },
      { status: 502 },
    );
  }
}
