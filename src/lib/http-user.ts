import { NextResponse } from "next/server";
import { userFromRequest, type UserAccount } from "./auth";

export async function requireUser(
  request: Request,
): Promise<UserAccount | NextResponse> {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to use the desk." },
      { status: 401 },
    );
  }
  return user;
}

export function isAccount(
  value: UserAccount | NextResponse,
): value is UserAccount {
  return !(value instanceof NextResponse);
}
