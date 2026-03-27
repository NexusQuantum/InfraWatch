import { NextResponse } from "next/server";
import { fetchLiveHostVm } from "@/lib/server/live-data";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const response = await fetchLiveHostVm(id);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch node VM data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
