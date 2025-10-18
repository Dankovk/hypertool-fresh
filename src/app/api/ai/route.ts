// @ts-nocheck
import { NextResponse } from "next/server";
import { loadBoilerplateFiles } from "@/lib/boilerplate";
import { AiRequestSchema } from "@/types/ai";
import { getProviderForModel } from "@/lib/aiProviders";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_FULL } from "@/config/prompts";
import {
  generateFullFiles,
  generatePatches,
  buildConversationPrompt,
} from "@/lib/aiService";
import { createStubTransform } from "@/lib/fallbacks";
import { normalizeFileMap } from "@/lib/fileUtils";

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

    const defaultPrompt = usePatchMode
      ? DEFAULT_SYSTEM_PROMPT
      : DEFAULT_SYSTEM_PROMPT_FULL;

    const conversation = buildConversationPrompt({
      systemPrompt: systemPrompt?.trim() || defaultPrompt,
      files: workingFiles,
      messages,
    });

    if (usePatchMode) {
      // Patch mode: Generate edits instead of full files
      const result = await generatePatches({
        model: aiModel,
        conversation,
        workingFiles,
      });

      return NextResponse.json({
        files: normalizeFileMap(result.files, { ensureLeadingSlash: true }),
        explanation: result.explanation,
        edits: result.edits,
        historyId: result.historyId,
        mode: "patch",
      });
    } else {
      // Full mode: Generate complete files
      const result = await generateFullFiles({
        model: aiModel,
        conversation,
      });

      return NextResponse.json({
        files: normalizeFileMap(result.files, { ensureLeadingSlash: true }),
        explanation: result.explanation,
        mode: "full",
      });
    }
  } catch (error) {
    console.error("AI SDK request failed", error);
    const fallback = createStubTransform(
      workingFiles,
      messages.map((m) => m.content).join("\n")
    );
    return NextResponse.json({
      files: fallback,
      explanation: "AI request failed; stub applied.",
    });
  }
}

export const runtime = "nodejs";
