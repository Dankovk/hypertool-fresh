// @ts-nocheck
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { loadBoilerplateFiles } from "@/lib/boilerplate";
import { AiRequestSchema } from "@/types/ai";

const MODEL_ID = "gpt-5";

const DEFAULT_SYSTEM_PROMPT =
  "You are an AI assistant that produces a complete file map for a p5.js canvas project. Always respond with valid JSON: { files: { path: code }, explanation?: string } covering every file.";

function stubTransform(files: Record<string, string>, prompt: string) {
  const nextFiles = { ...files };
  const indexHtml =
    nextFiles["/index.html"] ??
    `<!doctype html><html><head><meta charset="utf-8" /><title>p5 Sketch</title></head><body><script src="https://unpkg.com/p5@1.9.2/lib/p5.min.js"></script><script src="/sketch.js"></script></body></html>`;
  let sketch =
    nextFiles["/sketch.js"] ?? "function setup(){createCanvas(600,400);}function draw(){background('#0b0c10');}";

  if (/circle|orbit|ring/i.test(prompt)) {
    sketch =
      "function setup(){createCanvas(600,400);}function draw(){background('#0b0c10'); fill('#66fcf1'); noStroke(); circle(width/2,height/2,200);}";
  } else if (/noise|perlin|flow/i.test(prompt)) {
    sketch =
      "let t=0;function setup(){createCanvas(600,400);}function draw(){background('#0b0c10'); stroke('#66fcf1'); noFill(); beginShape(); for(let x=0;x<width;x+=4){const y=noise(x*0.01,t)*height; vertex(x,y);} endShape(); t+=0.01;}";
  }

  nextFiles["/index.html"] = indexHtml;
  nextFiles["/sketch.js"] = sketch;
  return nextFiles;
}

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = AiRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { messages, systemPrompt, apiKey } = parsed.data;
  const boilerplate = loadBoilerplateFiles();

  try {
    const provider = createOpenAI({
      apiKey: apiKey?.trim() || process.env.OPENAI_API_KEY,
    });
    
    const model = provider.chat(MODEL_ID);
    
    const result = await generateFileMap({
      messages,
      systemPrompt: systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
      model,
    });

    if (!result) {
      const fallback = stubTransform(boilerplate, messages.map((m) => m.content).join("\n"));
      return NextResponse.json({ files: fallback, explanation: "AI result invalid; stub applied." });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI SDK request failed", error);
    const fallback = stubTransform(boilerplate, messages.map((m) => m.content).join("\n"));
    return NextResponse.json({ files: fallback, explanation: "AI request failed; stub applied." });
  }
}

async function generateFileMap({
  model,
  messages,
  systemPrompt,
}: {
  model: any;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  systemPrompt: string;
}) {
  const conversation = [
    `System: ${systemPrompt}`,
    ...messages.map((message) => `${message.role}: ${message.content}`),
  ].join("\n\n");

  const schema: z.ZodObject<{
    files: z.ZodRecord<z.ZodString>;
    explanation: z.ZodOptional<z.ZodString>;
  }> = z.object({
    files: z.record(z.string()),
    explanation: z.string().optional(),
  });

  const result = await generateObject({
    model,
    schema,
    prompt: conversation,
  });

  const value = result.object;
  if (!value || typeof value !== "object" || !value.files || typeof value.files !== "object") {
    return null;
  }

  return {
    files: normalizeFileMap(value.files as Record<string, string>),
    explanation: typeof value.explanation === "string" ? value.explanation : undefined,
  };
}

function normalizeFileMap(files: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [path, value] of Object.entries(files)) {
    const key = path.startsWith("/") ? path : `/${path}`;
    out[key] = value;
  }
  return out;
}

export const runtime = "nodejs";

