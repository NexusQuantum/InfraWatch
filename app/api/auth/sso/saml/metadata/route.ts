import { NextRequest, NextResponse } from "next/server";
import { getSsoConfig } from "@/lib/server/sso-store";
import { generateSpMetadata } from "@/lib/server/sso-saml";

function getAppUrl(request: NextRequest): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || `localhost:${process.env.PORT || 3001}`;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  try {
    const config = await getSsoConfig("saml");
    const appUrl = getAppUrl(request);
    const callbackUrl = `${appUrl}/api/auth/sso/saml/callback`;

    // Generate metadata even if not yet configured (admin needs it during setup)
    const metadata = generateSpMetadata(
      config || {
        id: "saml",
        enabled: false,
        displayName: "",
        createdAt: "",
        updatedAt: "",
      },
      callbackUrl
    );

    return new NextResponse(metadata, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": 'inline; filename="saml-metadata.xml"',
      },
    });
  } catch (error) {
    console.error("[sso/saml/metadata] Error:", error);
    return NextResponse.json({ error: "Failed to generate SP metadata" }, { status: 500 });
  }
}
