import { NextResponse } from "next/server";
import { fetchLiveVms } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveVms();
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch VM list";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
