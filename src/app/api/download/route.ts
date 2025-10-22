import { NextResponse } from "next/server";
import { z } from "zod";
import JSZip from "jszip";
import { createLogger } from "@/lib/logger";

// export const runtime = "nodejs";

const FileMapSchema = z.record(z.string());

export async function POST(req: Request) {
  const requestId = `download-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/download', requestId);

  logger.info('Download request received');

  try {
    const body = await req.json();
    const parsed = FileMapSchema.safeParse(body.files);

    if (!parsed.success) {
      logger.warn('Invalid files provided', {
        validationErrors: parsed.error.errors,
      });
      return NextResponse.json({ error: "Invalid files" }, { status: 400 });
    }

    const files = parsed.data;
    const fileCount = Object.keys(files).length;

    logger.info('Creating ZIP archive', {
      fileCount,
      files: Object.keys(files),
    });

    const endTimer = logger.time('Generate ZIP archive');

    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      const cleanPath = path.replace(/^\//, "");
      zip.file(cleanPath, content);
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    endTimer();

    logger.info('ZIP archive created successfully', {
      fileCount,
      archiveSizeBytes: buffer.length,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=project.zip",
      },
    });
  } catch (error) {
    logger.error("Failed to create download archive", error);
    return NextResponse.json({ error: "Failed to create archive" }, { status: 500 });
  }
}

