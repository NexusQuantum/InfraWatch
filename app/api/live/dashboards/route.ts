import { NextResponse } from "next/server";
import { fetchLiveDashboards } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveDashboards();
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch dashboards";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
