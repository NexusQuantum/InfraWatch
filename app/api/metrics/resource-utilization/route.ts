import { NextRequest, NextResponse } from "next/server";
import { fetchLiveResourceUtilization } from "@/lib/server/live-data";

export async function GET(request: NextRequest) {
  try {
    const range = request.nextUrl.searchParams.get("range") || "24h";
    const step = request.nextUrl.searchParams.get("step") || "5m";
    const response = await fetchLiveResourceUtilization(range, step);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Prometheus metrics";
    return NextResponse.json(
      {
        source: "prometheus",
        error: message,
      },
      { status: 502 }
    );
  }
}
