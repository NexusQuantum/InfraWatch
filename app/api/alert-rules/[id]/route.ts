import { NextRequest, NextResponse } from "next/server";
import {
  getAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from "@/lib/server/alerts-store";
import { requireSession } from "@/lib/server/require-session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  const rule = await getAlertRule(id);
  if (!rule) {
    return NextResponse.json(
      { error: "Alert rule not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ data: rule });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireSession(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const payload = await request.json();
    const updated = await updateAlertRule(id, payload);
    if (!updated) {
      return NextResponse.json(
        { error: "Alert rule not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update alert rule",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  const ok = await deleteAlertRule(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Alert rule not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
