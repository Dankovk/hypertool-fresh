import { NextResponse } from "next/server";
import { z } from "zod";
import JSZip from "jszip";

export const runtime = "nodejs";

const FileMapSchema = z.record(z.string());

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = FileMapSchema.safeParse(body.files);
  if (!parsed.success) return NextResponse.json({ error: "Invalid files" }, { status: 400 });
  const files = parsed.data;

  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    const cleanPath = path.replace(/^\//, "");
    zip.file(cleanPath, content);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=project.zip",
    },
  });
}

