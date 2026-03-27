import { NextResponse } from "next/server";
import { deactivateLicense } from "@/lib/server/license-service";

export async function POST() {
  try {
    await deactivateLicense();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deactivation failed" },
      { status: 500 }
    );
  }
}
