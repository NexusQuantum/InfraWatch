import { NextRequest, NextResponse } from "next/server";
import { listAlerts } from "@/lib/server/alerts-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const alerts = await listAlerts({
      status: searchParams.get("status") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
      entityType: searchParams.get("entityType") ?? undefined,
      limit: searchParams.has("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
      offset: searchParams.has("offset")
        ? Number(searchParams.get("offset"))
        : undefined,
    });
    return NextResponse.json({ data: alerts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list alerts",
      },
      { status: 500 }
    );
  }
}
