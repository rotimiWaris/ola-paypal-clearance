import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { sql } from "./db";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "clearance_session";
const SESSION_DAYS = 30;

export type UserAccount = {
  id: string;
  email: string;
  name: string;
  merchantName: string;
  merchantPlace: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  merchant_name: string;
  merchant_place: string;
};

function account(row: UserRow): UserAccount {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    merchantName: row.merchant_name,
    merchantPlace: row.merchant_place,
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [kind, salt, hex] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hex) return false;
  const derived = (await scrypt(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(/(?:^|; )clearance_session=([^;]+)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export async function userFromToken(token: string): Promise<UserAccount | null> {
  const rows = await sql<UserRow>(
    `select users.id, users.email, users.name, users.password_hash, users.merchant_name, users.merchant_place
     from sessions
     join users on users.id = sessions.user_id
     where sessions.token_hash = $1 and sessions.expires_at > now()`,
    [hashToken(token)],
  );
  const row = rows[0];
  return row ? account(row) : null;
}

export async function userFromRequest(request: Request): Promise<UserAccount | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  return userFromToken(token);
}

export async function currentUser(): Promise<UserAccount | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userFromToken(token);
}

export async function openSession(userId: string): Promise<string> {
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql(
    "insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)",
    [hashToken(token), userId, expires.toISOString()],
  );
  return token;
}

export async function closeSession(token: string): Promise<void> {
  await sql("delete from sessions where token_hash = $1", [hashToken(token)]);
}

export async function findUserByEmail(email: string): Promise<(UserAccount & { passwordHash: string }) | null> {
  const rows = await sql<UserRow>(
    "select id, email, name, password_hash, merchant_name, merchant_place from users where email = $1",
    [email],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...account(row), passwordHash: row.password_hash };
}

export function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
