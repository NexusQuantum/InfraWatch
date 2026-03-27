import { NextRequest, NextResponse } from "next/server";
import { queryInstant, queryInstantWithConfig } from "@/lib/prometheus/client";
import { getConnectorConfig } from "@/lib/server/connectors-store";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const time = request.nextUrl.searchParams.get("time") || undefined;
  const connectorId = request.nextUrl.searchParams.get("connectorId");

  if (!query) {
    return NextResponse.json({ error: "Missing required query parameter: query" }, { status: 400 });
  }

  try {
    if (connectorId) {
      const config = await getConnectorConfig(connectorId);
      if (!config) {
        return NextResponse.json({ error: "Connector not found or disabled" }, { status: 404 });
      }
      const data = await queryInstantWithConfig(config, query, time);
      return NextResponse.json(data);
    }
    const data = await queryInstant(query, time);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prometheus query failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
