import { NextResponse } from "next/server";
import { clearSessionCookie, closeSession, readSessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = readSessionToken(request);
  if (token) await closeSession(token);
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
