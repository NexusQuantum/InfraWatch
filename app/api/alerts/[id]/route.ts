import { NextRequest, NextResponse } from "next/server";
import { acknowledgeAlert, resolveAlert } from "@/lib/server/alerts-store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "acknowledge") {
      const alert = await acknowledgeAlert(id);
      if (!alert) {
        return NextResponse.json(
          { error: "Alert not found or already resolved" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: alert });
    }

    if (action === "resolve") {
      const alert = await resolveAlert(id);
      if (!alert) {
        return NextResponse.json(
          { error: "Alert not found or already resolved" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: alert });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'acknowledge' or 'resolve'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update alert",
      },
      { status: 500 }
    );
  }
}
