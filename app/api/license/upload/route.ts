import { NextRequest, NextResponse } from "next/server";
import { uploadLicenseFile } from "@/lib/server/license-service";

export async function POST(request: NextRequest) {
  try {
    const { fileContent } = await request.json();
    if (!fileContent || typeof fileContent !== "string") {
      return NextResponse.json({ error: "fileContent is required" }, { status: 400 });
    }
    const state = await uploadLicenseFile(fileContent);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
