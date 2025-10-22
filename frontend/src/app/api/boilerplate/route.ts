import { NextResponse } from "next/server";
import { loadBoilerplateFiles, listAvailablePresets } from "@/lib/boilerplate";
import { createLogger } from "@/lib/logger";

export async function GET(req: Request) {
  const requestId = `boilerplate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/boilerplate', requestId);

  logger.info('Boilerplate request received');

  try {
    const { searchParams } = new URL(req.url);
    const presetId = searchParams.get("preset");
    const action = searchParams.get("action");

    logger.debug('Request parameters', { presetId, action });

    if (action === "list") {
      logger.info('Listing available presets');
      const presets = listAvailablePresets();
      logger.info('Presets retrieved', { presetCount: presets.length, presets });
      return NextResponse.json({ presets });
    }

    const effectivePreset = presetId || 'circle';
    logger.info('Loading boilerplate files', { preset: effectivePreset });

    const endTimer = logger.time('Load boilerplate files');
    const files = loadBoilerplateFiles(effectivePreset);
    endTimer();

    logger.info('Boilerplate files loaded successfully', {
      preset: effectivePreset,
      fileCount: Object.keys(files).length,
      files: Object.keys(files),
    });

    return NextResponse.json({ files });
  } catch (error: any) {
    logger.error("Failed to read boilerplate", error);
    return NextResponse.json({ error: error?.message ?? "Failed to read boilerplate" }, { status: 500 });
  }
}

// export const runtime = "nodejs";

