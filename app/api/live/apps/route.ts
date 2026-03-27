import { NextResponse } from "next/server";
import { fetchLiveApplications } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveApplications();
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch applications";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
