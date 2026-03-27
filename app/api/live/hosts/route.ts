import { NextResponse } from "next/server";
import { fetchLiveHosts } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveHosts();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load hosts" },
      { status: 500 }
    );
  }
}

