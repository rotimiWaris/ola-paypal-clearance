import { NextResponse } from "next/server";
import {
  findUserByEmail,
  openSession,
  sessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { tooFast } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (tooFast(20)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a moment and try again." },
      { status: 429 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    password?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const user = email ? await findUserByEmail(email) : null;
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    return NextResponse.json(
      { error: "That email and password do not match an account." },
      { status: 401 },
    );
  }
  const token = await openSession(user.id);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", sessionCookie(token));
  return response;
}
