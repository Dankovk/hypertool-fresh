import { NextResponse } from "next/server";
import { loadRuntimeBundles } from "@/lib/boilerplate";
import { createLogger } from "@/lib/logger";

// Force dynamic rendering and disable all caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const requestId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/runtime-watch/snapshot', requestId);

  logger.info('Runtime snapshot request received');

  if (process.env.NODE_ENV === "production") {
    logger.warn('Snapshot requested in production mode, returning empty bundles');
    return NextResponse.json({ bundles: {} });
  }

  const endTimer = logger.time('Load runtime bundles');

  try {
    logger.debug('Fetching fresh runtime bundles');
    const bundles = loadRuntimeBundles();
    const bundleKeys = Object.keys(bundles);
    const totalSize = Object.values(bundles).reduce((sum, code) => sum + code.length, 0);

    endTimer();

    logger.info('Runtime bundles loaded successfully', {
      bundleCount: bundleKeys.length,
      totalSizeBytes: totalSize,
      bundles: bundleKeys,
    });

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
    logger.error("Error loading runtime bundles", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to load runtime bundles" },
      { status: 500 },
    );
  }
}
