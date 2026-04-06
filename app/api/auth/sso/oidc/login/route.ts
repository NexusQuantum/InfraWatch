import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSsoConfig } from "@/lib/server/sso-store";
import { createSsoState } from "@/lib/server/sso-store";
import { createOidcAuthUrl } from "@/lib/server/sso-oidc";
import { randomPKCECodeVerifier } from "openid-client";

function getAppUrl(request: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || `localhost:${process.env.PORT || 3001}`;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  try {
    const config = await getSsoConfig("oidc");
    if (!config || !config.enabled) {
      return NextResponse.json({ error: "OIDC SSO is not configured" }, { status: 404 });
    }

    const appUrl = getAppUrl(request);
    const callbackUrl = `${appUrl}/api/auth/sso/oidc/callback`;

    const state = randomBytes(32).toString("hex");
    const nonce = randomBytes(32).toString("hex");
    const codeVerifier = randomPKCECodeVerifier();

    await createSsoState(state, nonce, codeVerifier);

    const authUrl = await createOidcAuthUrl(config, callbackUrl, state, nonce, codeVerifier);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[sso/oidc/login] Error:", error);
    return NextResponse.json({ error: "Failed to initiate OIDC login" }, { status: 500 });
  }
}
