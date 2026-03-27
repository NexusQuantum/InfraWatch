import { NextRequest, NextResponse } from "next/server";
import { fetchLiveVmTimeseries } from "@/lib/server/live-data";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const vmId = decodeURIComponent(id);
    const range = request.nextUrl.searchParams.get("range") ?? "1h";
    const step = request.nextUrl.searchParams.get("step") ?? "5m";
    const response = await fetchLiveVmTimeseries(vmId, range, step);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load VM timeseries" },
      { status: 500 }
    );
  }
}
