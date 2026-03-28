import { NextRequest, NextResponse } from "next/server";
import {
  validateCredentials,
  createSession,
  ensureAdminUser,
  checkRateLimit,
  recordLoginAttempt,
  generateCsrfToken,
} from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/require-session";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    await ensureAdminUser();

    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    await recordLoginAttempt(ip);
    const valid = await validateCredentials(username, password);

    if (!valid) {
      await logAudit("auth.login_failed", {
        detail: { username },
        ip,
      });
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const session = await createSession();
    const csrfToken = generateCsrfToken();

    await logAudit("auth.login", {
      detail: { username },
      ip,
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set("session", session.token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });

    response.cookies.set("csrf_token", csrfToken, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error("[auth/login] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
