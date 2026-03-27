import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/require-session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const ip = getClientIp(request);

  if (token) {
    await destroySession(token);
  }

  await logAudit("auth.logout", { ip });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("csrf_token", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
