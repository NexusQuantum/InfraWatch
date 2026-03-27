import { NextRequest, NextResponse } from "next/server";
import { queryRange, queryRangeWithConfig } from "@/lib/prometheus/client";
import { getConnectorConfig } from "@/lib/server/connectors-store";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const step = request.nextUrl.searchParams.get("step");
  const connectorId = request.nextUrl.searchParams.get("connectorId");

  if (!query || !start || !end || !step) {
    return NextResponse.json(
      { error: "Missing required query parameters: query, start, end, step" },
      { status: 400 }
    );
  }

  try {
    if (connectorId) {
      const config = await getConnectorConfig(connectorId);
      if (!config) {
        return NextResponse.json({ error: "Connector not found or disabled" }, { status: 404 });
      }
      const data = await queryRangeWithConfig(config, query, start, end, step);
      return NextResponse.json(data);
    }
    const data = await queryRange(query, start, end, step);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prometheus range query failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
