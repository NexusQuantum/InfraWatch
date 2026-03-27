import { NextRequest, NextResponse } from "next/server";
import { fetchLiveHostTimeseries } from "@/lib/server/live-data";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const range = request.nextUrl.searchParams.get("range") || "1h";
    const step = request.nextUrl.searchParams.get("step") || "5m";
    const response = await fetchLiveHostTimeseries(id, range, step);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch host timeseries";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
