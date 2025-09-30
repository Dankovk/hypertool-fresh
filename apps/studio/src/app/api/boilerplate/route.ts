import { NextResponse } from "next/server";
import { loadBoilerplateFiles } from "@/lib/boilerplate";

export async function GET() {
  try {
    const files = loadBoilerplateFiles();
    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed to read boilerplate" }, { status: 500 });
  }
}

export const runtime = "nodejs";

