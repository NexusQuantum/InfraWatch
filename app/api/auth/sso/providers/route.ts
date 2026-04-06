import { NextResponse } from "next/server";
import { listEnabledSsoProviders } from "@/lib/server/sso-store";

export async function GET() {
  try {
    const providers = await listEnabledSsoProviders();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("[sso/providers] Error:", error);
    return NextResponse.json({ providers: [] });
  }
}
