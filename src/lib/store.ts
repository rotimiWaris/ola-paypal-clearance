import { randomBytes } from "node:crypto";
import { sql } from "./db";
import type { Exhibit } from "./types";

function asExhibit(value: unknown): Exhibit {
  if (typeof value === "string") return JSON.parse(value) as Exhibit;
  return value as Exhibit;
}

export function newExhibitId(): string {
  return `ex_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

export async function listExhibits(userId: string): Promise<Exhibit[]> {
  const rows = await sql<{ document: unknown }>(
    "select document from exhibits where user_id = $1 order by created_at desc",
    [userId],
  );
  return rows.map((row) => asExhibit(row.document));
}

export async function getExhibit(
  userId: string,
  id: string,
): Promise<Exhibit | undefined> {
  const rows = await sql<{ document: unknown }>(
    "select document from exhibits where user_id = $1 and id = $2",
    [userId, id],
  );
  const row = rows[0];
  return row ? asExhibit(row.document) : undefined;
}

export async function findExhibitByOrder(
  userId: string,
  orderId: string,
): Promise<Exhibit | undefined> {
  const exhibits = await listExhibits(userId);
  return exhibits.find((item) => item.paypal?.orderId === orderId);
}

export async function saveExhibit(
  userId: string,
  exhibit: Exhibit,
): Promise<Exhibit> {
  const existing = await sql<{ user_id: string }>(
    "select user_id from exhibits where id = $1",
    [exhibit.id],
  );
  const document = JSON.stringify(exhibit);
  if (existing.length === 0) {
    await sql(
      `insert into exhibits (id, user_id, letter_id, document, created_at)
       values ($1, $2, $3, $4::jsonb, $5)`,
      [exhibit.id, userId, exhibit.mandateId, document, exhibit.createdAt],
    );
    return exhibit;
  }
  if (existing[0]?.user_id !== userId) {
    throw new Error("That exhibit belongs to another account.");
  }
  await sql("update exhibits set document = $2::jsonb where id = $1", [
    exhibit.id,
    document,
  ]);
  return exhibit;
}
