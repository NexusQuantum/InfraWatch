import { NextRequest, NextResponse } from "next/server";
import { listAlertRules, createAlertRule } from "@/lib/server/alerts-store";
import { requireSession } from "@/lib/server/require-session";

export async function GET(request: NextRequest) {
  const denied = await requireSession(request);
  if (denied) return denied;

  try {
    const rules = await listAlertRules();
    return NextResponse.json({ data: rules });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list alert rules",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireSession(request);
  if (denied) return denied;

  try {
    const payload = await request.json();
    const rule = await createAlertRule(payload);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create alert rule",
      },
      { status: 400 }
    );
  }
}
