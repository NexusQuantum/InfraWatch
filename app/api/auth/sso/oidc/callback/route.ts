import { NextRequest, NextResponse } from "next/server";
import { getSsoConfig, consumeSsoState } from "@/lib/server/sso-store";
import { handleOidcCallback } from "@/lib/server/sso-oidc";
import { createSession, generateCsrfToken } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { getClientIp } from "@/lib/server/require-session";
import { isSecureCookie } from "@/lib/server/cookie-options";

function getAppUrl(request: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || `localhost:${process.env.PORT || 3001}`;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const appUrl = getAppUrl(request);

  try {
    const config = await getSsoConfig("oidc");
    if (!config || !config.enabled) {
      return NextResponse.redirect(new URL("/login?error=sso_not_configured", appUrl));
    }

    const { searchParams } = new URL(request.url);
    const error = searchParams.get("error");
    if (error) {
      const desc = searchParams.get("error_description") || error;
      await logAudit("auth.sso_login_failed", {
        detail: { provider: "oidc", error: desc },
        ip,
      });
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(desc)}`, appUrl));
    }

    const state = searchParams.get("state");
    if (!state) {
      return NextResponse.redirect(new URL("/login?error=missing_state", appUrl));
    }

    const storedState = await consumeSsoState(state);
    if (!storedState) {
      await logAudit("auth.sso_login_failed", {
        detail: { provider: "oidc", error: "Invalid or expired state" },
        ip,
      });
      return NextResponse.redirect(new URL("/login?error=invalid_state", appUrl));
    }

    const callbackUrl = `${appUrl}/api/auth/sso/oidc/callback`;

    // Rebuild currentUrl with the real host (request.url may contain 0.0.0.0)
    const currentUrl = new URL(`${callbackUrl}?${searchParams.toString()}`);

    const result = await handleOidcCallback(
      config,
      callbackUrl,
      currentUrl,
      state,
      storedState.nonce,
      storedState.codeVerifier
    );

    const session = await createSession({
      provider: "oidc",
      email: result.email,
      name: result.name,
    });
    const csrfToken = generateCsrfToken();

    await logAudit("auth.sso_login", {
      detail: { provider: "oidc", email: result.email, name: result.name },
      ip,
    });

    const response = NextResponse.redirect(new URL("/", appUrl));

    response.cookies.set("session", session.token, {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });

    response.cookies.set("csrf_token", csrfToken, {
      httpOnly: false,
      secure: isSecureCookie(),
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error("[sso/oidc/callback] Error:", error);
    await logAudit("auth.sso_login_failed", {
      detail: {
        provider: "oidc",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      ip,
    });
    return NextResponse.redirect(
      new URL("/login?error=sso_callback_failed", appUrl)
    );
  }
}
