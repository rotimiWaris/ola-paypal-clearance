import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { endOfPacificDay, pacificToday, parseDollars } from "@/lib/money";
import { insertLetter, listLetters } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  return NextResponse.json({ letters: await listLetters(user.id) });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  if (user.merchantName.trim().length < 2) {
    return NextResponse.json(
      { error: "Name your company on the shelf before you sign a letter." },
      { status: 400 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const buyerName = text(body.buyerName, 80);
  const buyerRole = text(body.buyerRole, 80) || "Buyer";
  const buyerOrg = text(body.buyerOrg, 80);
  const categories = Array.isArray(body.categories)
    ? [
        ...new Set(
          body.categories
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().toLowerCase())
            .filter((item) => /^[a-z0-9][a-z0-9 -]{0,39}$/.test(item)),
        ),
      ]
    : [];
  const maxUnit = parseDollars(typeof body.maxUnitPrice === "string" ? body.maxUnitPrice : "");
  const maxBasket = parseDollars(typeof body.maxBasket === "string" ? body.maxBasket : "");
  const maxQty = Number(body.maxQty);
  const expiresOn = text(body.expiresOn, 10);
  const expiresAt = endOfPacificDay(expiresOn);
  if (buyerName.length < 2 || buyerOrg.length < 2) {
    return NextResponse.json(
      { error: "Name the buyer and the organization the letter belongs to." },
      { status: 400 },
    );
  }
  if (categories.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one category the letter allows." },
      { status: 400 },
    );
  }
  if (maxUnit === null || maxUnit < 1 || maxBasket === null || maxBasket < 1) {
    return NextResponse.json(
      { error: "Enter the unit price cap and the basket cap in dollars." },
      { status: 400 },
    );
  }
  if (maxBasket < maxUnit) {
    return NextResponse.json(
      { error: "The basket cap has to be at least the unit price cap." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(maxQty) || maxQty < 1 || maxQty > 24) {
    return NextResponse.json(
      { error: "The quantity cap has to be a whole number from 1 to 24." },
      { status: 400 },
    );
  }
  if (!expiresAt || expiresOn < pacificToday()) {
    return NextResponse.json(
      { error: "Choose an expiry date that is today or later, Pacific time." },
      { status: 400 },
    );
  }
  const letter = await insertLetter(user.id, {
    buyerName,
    buyerRole,
    buyerOrg,
    merchantName: user.merchantName,
    merchantPlace: user.merchantPlace,
    signedAt: new Date().toISOString(),
    expiresAt,
    categories,
    maxUnitPriceCents: maxUnit,
    maxBasketCents: maxBasket,
    maxQtyPerSku: maxQty,
    allowSubscriptions: Boolean(body.allowSubscriptions),
  });
  return NextResponse.json({ letter });
}
