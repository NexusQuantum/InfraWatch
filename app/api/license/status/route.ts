import { NextResponse } from "next/server";
import { getLicenseState } from "@/lib/server/license-service";

export async function GET() {
  return NextResponse.json(getLicenseState());
}
