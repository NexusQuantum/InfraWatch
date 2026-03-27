import { NextResponse } from "next/server";
import { fetchLiveVm } from "@/lib/server/live-data";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const response = await fetchLiveVm(id);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch VM detail";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
