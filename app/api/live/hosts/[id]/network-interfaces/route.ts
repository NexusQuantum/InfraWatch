import { NextRequest, NextResponse } from "next/server";
import { fetchLiveHostNetworkInterfaces } from "@/lib/server/live-data";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const raw = request.nextUrl.searchParams.get("raw") === "true";
    const response = await fetchLiveHostNetworkInterfaces(id, raw);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch node network interfaces";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
