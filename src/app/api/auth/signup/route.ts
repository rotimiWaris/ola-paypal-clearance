import { NextResponse } from "next/server";
import {
  findUserByEmail,
  hashPassword,
  openSession,
  sessionCookie,
} from "@/lib/auth";
import { createUser } from "@/lib/records";
import { tooFast } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  if (tooFast(20)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a moment and try again." },
      { status: 429 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const merchantName = clean(body.merchantName, 80);
  const merchantPlace = clean(body.merchantPlace, 80);
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Use a password of at least 8 characters." },
      { status: 400 },
    );
  }
  if (merchantName.length < 2) {
    return NextResponse.json(
      { error: "Enter the company this desk belongs to." },
      { status: 400 },
    );
  }
  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with that email already exists. Sign in instead." },
      { status: 409 },
    );
  }
  const userId = await createUser({
    email,
    name,
    passwordHash: await hashPassword(password),
    merchantName,
    merchantPlace,
  });
  const token = await openSession(userId);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", sessionCookie(token));
  return response;
}
