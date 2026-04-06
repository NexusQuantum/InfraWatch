import { NextRequest, NextResponse } from "next/server";
import { validateSession, getSessionIdentity } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const valid = await validateSession(token);
  if (!valid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const identity = await getSessionIdentity(token);

  return NextResponse.json({
    authenticated: true,
    ...(identity?.ssoProvider && {
      ssoProvider: identity.ssoProvider,
      email: identity.ssoEmail,
      name: identity.ssoName,
    }),
  });
}
