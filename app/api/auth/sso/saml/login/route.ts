import { NextRequest, NextResponse } from "next/server";
import { getSsoConfig } from "@/lib/server/sso-store";
import { createSamlLoginRequest } from "@/lib/server/sso-saml";

function getAppUrl(request: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || `localhost:${process.env.PORT || 3001}`;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  try {
    const config = await getSsoConfig("saml");
    if (!config || !config.enabled) {
      return NextResponse.json({ error: "SAML SSO is not configured" }, { status: 404 });
    }

    const appUrl = getAppUrl(request);
    const callbackUrl = `${appUrl}/api/auth/sso/saml/callback`;

    const redirectUrl = await createSamlLoginRequest(config, callbackUrl);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[sso/saml/login] Error:", error);
    return NextResponse.json({ error: "Failed to initiate SAML login" }, { status: 500 });
  }
}
