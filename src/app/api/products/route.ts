import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { parseDollars } from "@/lib/money";
import { insertProduct, listProducts } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  return NextResponse.json({ products: await listProducts(user.id) });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    category?: unknown;
    price?: unknown;
    subscription?: unknown;
    note?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const category =
    typeof body.category === "string"
      ? body.category.trim().toLowerCase().slice(0, 40)
      : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 140) : "";
  const price = parseDollars(typeof body.price === "string" ? body.price : "");
  if (name.length < 2) {
    return NextResponse.json({ error: "Name the product." }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9 -]{0,39}$/.test(category)) {
    return NextResponse.json(
      { error: "Give the product a category, such as pantry or parts." },
      { status: 400 },
    );
  }
  if (price === null || price < 1) {
    return NextResponse.json(
      { error: "Enter a price in dollars, such as 18 or 18.50." },
      { status: 400 },
    );
  }
  const product = await insertProduct(user.id, {
    name,
    category,
    unitPriceCents: price,
    subscription: Boolean(body.subscription),
    note,
  });
  return NextResponse.json({ product });
}
