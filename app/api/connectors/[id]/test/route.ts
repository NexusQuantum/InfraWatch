import { NextRequest, NextResponse } from "next/server";
import { testConnector } from "@/lib/server/connectors-store";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const result = await testConnector(id);
  if (!result.success) {
    return NextResponse.json({ data: result }, { status: 502 });
  }
  return NextResponse.json({ data: result });
}

