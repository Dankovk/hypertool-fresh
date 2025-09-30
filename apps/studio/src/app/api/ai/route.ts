import { NextResponse } from "next/server";
import { z } from "zod";
import { join } from "node:path";
import { readdirSync, readFileSync } from "node:fs";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const FileMapSchema = z.record(z.string());

const BodySchema = z.object({
  messages: z.array(ChatMessageSchema.pick({ role: true, content: true })),
  boilerplate: FileMapSchema,
});

function stubTransform(files: Record<string, string>, prompt: string) {
  // Minimal demo: if prompt mentions "circle", inject a p5 circle; else echo.
  const newFiles = { ...files };
  const indexHtml = newFiles["/index.html"] ?? `<!doctype html><html><head><meta charset=\"utf-8\" /><title>p5 Sketch</title></head><body><script src=\"https://unpkg.com/p5@1.9.2/lib/p5.min.js\"></script><script src=\"/sketch.js\"></script></body></html>`;
  let sketch = newFiles["/sketch.js"] ?? "function setup(){createCanvas(600,400);}function draw(){background('#0b0c10');}";
  if (/circle|orbit|ring/i.test(prompt)) {
    sketch = "function setup(){createCanvas(600,400);}function draw(){background('#0b0c10'); fill('#66fcf1'); noStroke(); circle(width/2,height/2,200);}";
  } else if (/noise|perlin|flow/i.test(prompt)) {
    sketch = "let t=0;function setup(){createCanvas(600,400);}function draw(){background('#0b0c10'); stroke('#66fcf1'); noFill(); beginShape(); for(let x=0;x<width;x+=4){const y=noise(x*0.01,t)*height; vertex(x,y);} endShape(); t+=0.01;}";
  }
  newFiles["/index.html"] = indexHtml;
  newFiles["/sketch.js"] = sketch;
  return newFiles;
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { messages } = parsed.data;
  // Always start from on-disk boilerplate to avoid drift
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
  const boilerplate = readAllFiles(join(process.cwd(), "apps/boilerplate"));
  const userText = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");

  // Optional: integrate OpenAI if key exists; else stub
  const apiKey = process.env.OPENAI_API_KEY;
  let files = boilerplate;
  if (!apiKey) {
    files = stubTransform(boilerplate, userText);
    return NextResponse.json({ files, explanation: "Stubbed transformation applied." });
  }

  // If key exists, you can integrate with the model to produce full file map
  // For now, we still apply the stub to keep the flow working; replace with real call if desired.
  files = stubTransform(boilerplate, userText);
  return NextResponse.json({ files, explanation: "AI transformation applied." });
}

export const runtime = "nodejs";

