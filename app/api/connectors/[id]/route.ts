import { NextRequest, NextResponse } from "next/server";
import { deleteConnector, getStoredConnector, listConnectors, updateConnector } from "@/lib/server/connectors-store";
import { invalidatePrefix } from "@/lib/server/cache";
import { requireSession, getClientIp } from "@/lib/server/require-session";
import { logAudit } from "@/lib/server/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const denied = await requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  const connectors = await listConnectors();
  const connector = connectors.find((item) => item.id === id);
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }
  return NextResponse.json({ data: connector });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  const existing = await getStoredConnector(id);
  if (!existing) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const updated = await updateConnector(id, payload);
    if (!updated) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }
    invalidatePrefix("live:");
    logAudit("connector.update", {
      targetId: id,
      targetName: updated.name,
      detail: payload,
      ip: getClientIp(request),
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update connector" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const denied = await requireSession(request);
  if (denied) return denied;

  const { id } = await params;
  const existing = await getStoredConnector(id);
  const ok = await deleteConnector(id);
  if (!ok) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }
  invalidatePrefix("live:");
  logAudit("connector.delete", {
    targetId: id,
    targetName: existing?.name,
    ip: getClientIp(request),
  });
  return NextResponse.json({ success: true });
}
