import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function readAllFiles(dir: string, base: string = dir, out: Record<string, string> = {}) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      readAllFiles(full, base, out);
    } else {
      const rel = full.replace(base + "/", "");
      out["/" + rel] = readFileSync(full, "utf8");
    }
  }
  return out;
}

export async function GET() {
  const boilerplatePath = join(process.cwd(), "apps/boilerplate");
  const files = readAllFiles(boilerplatePath);
  return NextResponse.json({ files });
}

export const runtime = "nodejs";

