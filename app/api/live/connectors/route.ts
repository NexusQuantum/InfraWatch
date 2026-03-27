import { NextResponse } from "next/server";
import { fetchLiveConnectors } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveConnectors();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load connectors" },
      { status: 500 }
    );
  }
}

