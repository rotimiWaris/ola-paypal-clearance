import { NextResponse } from "next/server";
import { isAccount, requireUser } from "@/lib/http-user";
import { deleteProduct } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(request);
  if (!isAccount(user)) return user;
  const { id } = await context.params;
  const removed = await deleteProduct(user.id, id);
  if (!removed) {
    return NextResponse.json({ error: "That product is not on your shelf." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
