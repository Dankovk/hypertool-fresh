import { NextResponse } from "next/server";
import { loadRuntimeBundles } from "@/lib/boilerplate";

export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ bundles: {} });
  }

  try {
    const bundles = loadRuntimeBundles();
    return NextResponse.json({ bundles });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to load runtime bundles" },
      { status: 500 },
    );
  }
}
