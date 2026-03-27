import { NextResponse } from "next/server";
import { countActiveAlerts } from "@/lib/server/alerts-store";

export async function GET() {
  try {
    const count = await countActiveAlerts();
    return NextResponse.json({ data: count });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to count alerts",
      },
      { status: 500 }
    );
  }
}
