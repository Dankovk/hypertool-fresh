import { NextResponse } from "next/server";
import { loadRuntimeBundles } from "@/lib/boilerplate";

// Force dynamic rendering and disable all caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ bundles: {} });
  }

  try {
    console.log("[snapshot] Fetching fresh runtime bundles...");
    const bundles = loadRuntimeBundles();
    const bundleKeys = Object.keys(bundles);
    const totalSize = Object.values(bundles).reduce((sum, code) => sum + code.length, 0);
    console.log(`[snapshot] Returning ${bundleKeys.length} bundles, ${totalSize} total bytes`);
    return NextResponse.json(
      { bundles },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      },
    );
  } catch (error: any) {
    console.error("[snapshot] Error loading bundles:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to load runtime bundles" },
      { status: 500 },
    );
  }
}
