import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { getExhibit } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const { id } = await context.params;
  const exhibit = await getExhibit(user.id, id);
  if (!exhibit) {
    return NextResponse.json({ error: "No exhibit with that id." }, { status: 404 });
  }
  return NextResponse.json({ exhibit });
}
