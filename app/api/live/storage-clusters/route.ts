import { NextResponse } from "next/server";
import { fetchLiveStorageClusters } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveStorageClusters();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load storage clusters" },
      { status: 500 }
    );
  }
}

