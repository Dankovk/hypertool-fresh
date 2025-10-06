// @ts-nocheck
import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { loadBoilerplateFiles } from "@/lib/boilerplate";
import {
  AiRequestSchema,
  CodeEditSchema,
  type CodeEdit,
} from "@/types/ai";
import {
  applyEditsToFiles,
  parseSearchReplaceBlocks,
  createHistoryEntry,
} from "@/lib/patches";
import { getHistoryManager } from "@/lib/history";

interface ProviderConfig {
  apiKey?: string;
  envKey?: string;
}

function getProviderForModel(model: string, userApiKey?: string): any {
  // User-provided API key always takes precedence
  if (userApiKey?.trim()) {
    // Determine provider from model prefix
    if (model.startsWith('claude-')) {
      return createAnthropic({ apiKey: userApiKey.trim() });
    }
    if (model.startsWith('gemini-') || model.startsWith('models/gemini')) {
      return google(userApiKey.trim());
    }
    if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) {
      return createOpenAI({ apiKey: userApiKey.trim() });
    }
  }

  // Fall back to environment variables based on model prefix
  if (model.startsWith('claude-')) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
    return createAnthropic({ apiKey });
  }

  if (model.startsWith('gemini-') || model.startsWith('models/gemini')) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');
    return google(apiKey);
  }

  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    return createOpenAI({ apiKey });
  }

  throw new Error(`Unsupported model: ${model}`);
}

const DEFAULT_SYSTEM_PROMPT_FULL =
  "You are an AI assistant that modifies p5.js canvas projects. You will receive the current project files and user instructions. Make the requested changes while preserving any existing code that should remain. Always respond with a complete file map including ALL files (modified and unmodified): { files: { path: code }, explanation?: string }.";

const DEFAULT_SYSTEM_PROMPT_PATCH =
  `You are an AI assistant that modifies p5.js canvas projects using precise code patches. You will receive the current project files and user instructions.

For each change, generate a search/replace block in this format:

<<<<<<< SEARCH
[exact code to find - include enough context to uniquely identify the location]
=======
[replacement code]
>>>>>>> REPLACE

IMPORTANT RULES:
1. Include sufficient context (2-3 lines before/after) to uniquely identify the edit location
2. Match indentation and whitespace exactly in the SEARCH block
3. Only include the specific code section being changed, not entire files
4. You can make multiple edits across different files
5. Specify the file path for each edit

Respond with: { edits: [{ type: "search-replace", filePath: "/path/to/file", search: "...", replace: "..." }], explanation?: "..." }`;

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

  const { messages, model, systemPrompt, apiKey, currentFiles, editMode } =
    parsed.data;
  const boilerplate = loadBoilerplateFiles();
  const workingFiles =
    currentFiles && Object.keys(currentFiles).length > 0
      ? currentFiles
      : boilerplate;

  const usePatchMode = editMode === "patch";

  try {
    const provider = getProviderForModel(model, apiKey);
    const aiModel = provider.chat(model);

    const filesContext = Object.entries(workingFiles)
      .map(([path, code]) => `File: ${path}\n\`\`\`\n${code}\n\`\`\``)
      .join("\n\n");

    const defaultPrompt = usePatchMode
      ? DEFAULT_SYSTEM_PROMPT_PATCH
      : DEFAULT_SYSTEM_PROMPT_FULL;

    const conversation = [
      `System: ${systemPrompt?.trim() || defaultPrompt}`,
      `\nCurrent project files:\n${filesContext}\n`,
      ...messages.map((message) => `${message.role}: ${message.content}`),
    ].join("\n\n");

    if (usePatchMode) {
      // Patch mode: Generate edits instead of full files
      const schema = z.object({
        edits: z.array(CodeEditSchema),
        explanation: z.string().optional(),
      });

      const result = await generateObject({
        model: aiModel,
        schema,
        prompt: conversation,
      });

      const value = result.object;
      if (
        !value ||
        typeof value !== "object" ||
        !value.edits ||
        !Array.isArray(value.edits)
      ) {
        return NextResponse.json(
          { error: "AI failed to generate valid edits" },
          { status: 500 }
        );
      }

      // Apply patches
      const patchResult = applyEditsToFiles(
        workingFiles,
        value.edits as CodeEdit[]
      );

      if (!patchResult.success) {
        return NextResponse.json(
          {
            error: "Failed to apply patches",
            details: patchResult.errors,
            partialFiles: patchResult.files,
          },
          { status: 500 }
        );
      }

      // Store in history
      const historyManager = getHistoryManager();
      const historyEntry = createHistoryEntry(
        value.edits as CodeEdit[],
        workingFiles,
        patchResult.files,
        value.explanation
      );
      historyManager.push(historyEntry);

      return NextResponse.json({
        files: normalizeFileMap(patchResult.files),
        explanation: value.explanation,
        edits: value.edits,
        historyId: historyEntry.id,
        mode: "patch",
      });
    } else {
      // Full mode: Generate complete files (original behavior)
      const schema = z.object({
        files: z.record(z.string()),
        explanation: z.string().optional(),
      });

      const result = await generateObject({
        model: aiModel,
        schema,
        prompt: conversation,
      });

      const value = result.object;
      if (
        !value ||
        typeof value !== "object" ||
        !value.files ||
        typeof value.files !== "object"
      ) {
        const fallback = stubTransform(
          workingFiles,
          messages.map((m) => m.content).join("\n")
        );
        return NextResponse.json({
          files: fallback,
          explanation: "AI result invalid; stub applied.",
        });
      }

      return NextResponse.json({
        files: normalizeFileMap(value.files as Record<string, string>),
        explanation:
          typeof value.explanation === "string"
            ? value.explanation
            : undefined,
        mode: "full",
      });
    }
  } catch (error) {
    console.error("AI SDK request failed", error);
    const fallback = stubTransform(
      workingFiles,
      messages.map((m) => m.content).join("\n")
    );
    return NextResponse.json({
      files: fallback,
      explanation: "AI request failed; stub applied.",
    });
  }
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

