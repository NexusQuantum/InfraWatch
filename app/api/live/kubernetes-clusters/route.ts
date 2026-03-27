import { NextResponse } from "next/server";
import { fetchLiveKubernetesClusters } from "@/lib/server/live-data";

export async function GET() {
  try {
    const response = await fetchLiveKubernetesClusters();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load kubernetes clusters" },
      { status: 500 }
    );
  }
}

