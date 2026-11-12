import { mandateHash } from "./hash";
import { newId } from "./auth";
import { sql } from "./db";
import type { Mandate, Product } from "./types";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit_price_cents: number;
  subscription: boolean;
  note: string;
};

type LetterRow = {
  id: string;
  merchant_name: string;
  merchant_place: string;
  buyer_name: string;
  buyer_role: string;
  buyer_org: string;
  categories: unknown;
  max_unit_price_cents: number;
  max_basket_cents: number;
  max_qty_per_sku: number;
  allow_subscriptions: boolean;
  signed_at: unknown;
  expires_at: unknown;
};

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }
  return [];
}

function product(row: ProductRow): Product & { id: string } {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    unitPriceCents: Number(row.unit_price_cents),
    subscription: Boolean(row.subscription),
    note: row.note,
  };
}

export function letterFromRow(row: LetterRow): Mandate & { hash: string } {
  const mandate: Mandate = {
    id: row.id,
    buyerName: row.buyer_name,
    buyerRole: row.buyer_role,
    buyerOrg: row.buyer_org,
    merchantName: row.merchant_name,
    merchantPlace: row.merchant_place,
    signedAt: asIso(row.signed_at),
    expiresAt: asIso(row.expires_at),
    currency: "USD",
    categories: asStrings(row.categories),
    maxUnitPriceCents: Number(row.max_unit_price_cents),
    maxBasketCents: Number(row.max_basket_cents),
    maxQtyPerSku: Number(row.max_qty_per_sku),
    allowSubscriptions: Boolean(row.allow_subscriptions),
  };
  return { ...mandate, hash: mandateHash(mandate) };
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  merchantName: string;
  merchantPlace: string;
}): Promise<string> {
  const id = newId("usr");
  await sql(
    `insert into users (id, email, name, password_hash, merchant_name, merchant_place)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      input.email,
      input.name,
      input.passwordHash,
      input.merchantName,
      input.merchantPlace,
    ],
  );
  return id;
}

export async function updateMerchant(
  userId: string,
  merchantName: string,
  merchantPlace: string,
): Promise<void> {
  await sql(
    "update users set merchant_name = $2, merchant_place = $3 where id = $1",
    [userId, merchantName, merchantPlace],
  );
}

export async function listProducts(userId: string): Promise<(Product & { id: string })[]> {
  const rows = await sql<ProductRow>(
    `select id, sku, name, category, unit_price_cents, subscription, note
     from products where user_id = $1 order by created_at asc`,
    [userId],
  );
  return rows.map(product);
}

export async function insertProduct(
  userId: string,
  input: Omit<Product, "sku"> & { sku?: string },
): Promise<Product & { id: string }> {
  const existing = await listProducts(userId);
  const taken = new Set(existing.map((item) => item.sku));
  const base =
    (input.sku || input.name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 16) || "ITEM";
  let sku = base;
  let n = 2;
  while (taken.has(sku)) {
    sku = `${base.slice(0, 12)}-${n}`;
    n += 1;
  }
  const id = newId("prd");
  await sql(
    `insert into products (id, user_id, sku, name, category, unit_price_cents, subscription, note)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      userId,
      sku,
      input.name,
      input.category,
      input.unitPriceCents,
      input.subscription,
      input.note,
    ],
  );
  return {
    id,
    sku,
    name: input.name,
    category: input.category,
    unitPriceCents: input.unitPriceCents,
    subscription: input.subscription,
    note: input.note,
  };
}

export async function deleteProduct(userId: string, id: string): Promise<boolean> {
  const rows = await sql<{ id: string }>(
    "delete from products where id = $1 and user_id = $2 returning id",
    [id, userId],
  );
  return rows.length > 0;
}

const LETTER_COLUMNS = `id, merchant_name, merchant_place, buyer_name, buyer_role, buyer_org,
  categories, max_unit_price_cents, max_basket_cents, max_qty_per_sku, allow_subscriptions,
  signed_at, expires_at`;

export async function listLetters(userId: string): Promise<(Mandate & { hash: string })[]> {
  const rows = await sql<LetterRow>(
    `select ${LETTER_COLUMNS} from letters where user_id = $1 order by created_at desc`,
    [userId],
  );
  return rows.map(letterFromRow);
}

export async function getLetter(
  userId: string,
  id: string,
): Promise<(Mandate & { hash: string }) | null> {
  const rows = await sql<LetterRow>(
    `select ${LETTER_COLUMNS} from letters where user_id = $1 and id = $2`,
    [userId, id],
  );
  const row = rows[0];
  return row ? letterFromRow(row) : null;
}

export async function insertLetter(
  userId: string,
  mandate: Omit<Mandate, "id" | "currency"> & { id?: string },
): Promise<Mandate & { hash: string }> {
  const id = mandate.id || newId("ltr");
  const full: Mandate = { ...mandate, id, currency: "USD" };
  const hash = mandateHash(full);
  await sql(
    `insert into letters (
      id, user_id, merchant_name, merchant_place, buyer_name, buyer_role, buyer_org,
      categories, max_unit_price_cents, max_basket_cents, max_qty_per_sku,
      allow_subscriptions, signed_at, expires_at, content_hash
    ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15)`,
    [
      id,
      userId,
      full.merchantName,
      full.merchantPlace,
      full.buyerName,
      full.buyerRole,
      full.buyerOrg,
      JSON.stringify(full.categories),
      full.maxUnitPriceCents,
      full.maxBasketCents,
      full.maxQtyPerSku,
      full.allowSubscriptions,
      full.signedAt,
      full.expiresAt,
      hash,
    ],
  );
  return { ...full, hash };
}
