import { NextResponse } from "next/server";
import { fetchLiveComputeClusters } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveComputeClusters();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load compute clusters" },
      { status: 500 }
    );
  }
}

