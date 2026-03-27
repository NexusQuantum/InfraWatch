import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "./auth";

export async function requireSession(
  request: NextRequest
): Promise<NextResponse | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const valid = await validateSession(token);
  if (!valid) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  return null; // session is valid
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
