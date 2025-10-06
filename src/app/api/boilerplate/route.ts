import { NextResponse } from "next/server";
import { loadBoilerplateFiles, listAvailablePresets } from "@/lib/boilerplate";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const presetId = searchParams.get("preset");
    const action = searchParams.get("action");

    if (action === "list") {
      const presets = listAvailablePresets();
      return NextResponse.json({ presets });
    }

    const files = loadBoilerplateFiles(presetId || undefined);
    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed to read boilerplate" }, { status: 500 });
  }
}

export const runtime = "nodejs";

