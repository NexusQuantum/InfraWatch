import { NextRequest, NextResponse } from "next/server";
import { activateLicenseKey } from "@/lib/server/license-service";

export async function POST(request: NextRequest) {
  try {
    const { licenseKey } = await request.json();
    if (!licenseKey || typeof licenseKey !== "string") {
      return NextResponse.json({ error: "licenseKey is required" }, { status: 400 });
    }
    const state = await activateLicenseKey(licenseKey);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation failed" },
      { status: 500 }
    );
  }
}
