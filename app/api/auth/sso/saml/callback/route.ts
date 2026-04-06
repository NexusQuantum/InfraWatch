import { NextRequest, NextResponse } from "next/server";
import { getSsoConfig } from "@/lib/server/sso-store";
import { validateSamlResponse } from "@/lib/server/sso-saml";
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const appUrl = getAppUrl(request);

  try {
    const config = await getSsoConfig("saml");
    if (!config || !config.enabled) {
      return NextResponse.redirect(new URL("/login?error=sso_not_configured", appUrl));
    }
    const callbackUrl = `${appUrl}/api/auth/sso/saml/callback`;

    // Parse form data (SAML POST binding)
    const formData = await request.formData();
    const body: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      body[key] = value.toString();
    }

    if (!body.SAMLResponse) {
      return NextResponse.redirect(new URL("/login?error=missing_saml_response", appUrl));
    }

    const result = await validateSamlResponse(config, callbackUrl, body);

    const session = await createSession({
      provider: "saml",
      email: result.email,
      name: result.name,
    });
    const csrfToken = generateCsrfToken();

    await logAudit("auth.sso_login", {
      detail: { provider: "saml", email: result.email, name: result.name },
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
    console.error("[sso/saml/callback] Error:", error);
    await logAudit("auth.sso_login_failed", {
      detail: {
        provider: "saml",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      ip,
    });
    return NextResponse.redirect(
      new URL("/login?error=sso_callback_failed", appUrl)
    );
  }
}
