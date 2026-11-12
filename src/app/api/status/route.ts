import { NextResponse } from "next/server";
import { modelLabel } from "@/lib/llm";
import { paypalConfigured } from "@/lib/paypal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    paypal: paypalConfigured(),
    model: modelLabel(),
  });
}
