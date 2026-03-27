import { NextRequest, NextResponse } from "next/server";
import { createConnector, listConnectors } from "@/lib/server/connectors-store";
import { invalidatePrefix } from "@/lib/server/cache";
import { requireSession, getClientIp } from "@/lib/server/require-session";
import { logAudit } from "@/lib/server/audit";

export async function GET(request: NextRequest) {
  const denied = await requireSession(request);
  if (denied) return denied;

  try {
    const connectors = await listConnectors();
    return NextResponse.json({ data: connectors });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list connectors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireSession(request);
  if (denied) return denied;

  try {
    const payload = await request.json();
    const connector = await createConnector(payload);
    invalidatePrefix("live:");
    logAudit("connector.create", {
      targetId: connector.id,
      targetName: connector.name,
      detail: { connectorType: connector.connectorType, baseUrl: connector.baseUrl },
      ip: getClientIp(request),
    });
    return NextResponse.json({ data: connector }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create connector" },
      { status: 400 }
    );
  }
}
