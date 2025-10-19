// @ts-nocheck
import { NextResponse } from "next/server";
import { loadBoilerplateFiles, ensureSystemFiles } from "@/lib/boilerplate";
import { AiRequestSchema } from "@/types/ai";
import { getProviderForModel } from "@/lib/aiProviders";
import { DEFAULT_SYSTEM_PROMPT_FULL, DEFAULT_SYSTEM_PROMPT_PATCH } from "@/config/prompts";
import {
  generateFullFiles,
  generatePatches,
  buildConversationPrompt,
} from "@/lib/aiService";
import { createStubTransform } from "@/lib/fallbacks";
import { normalizeFileMap } from "@/lib/fileUtils";

function filterUserFacingFiles(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const INTERNAL_PREFIX = "__hypertool__/";

  Object.entries(files).forEach(([path, contents]) => {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    if (!normalizedPath.startsWith(INTERNAL_PREFIX)) {
      result[path] = contents;
    }
  });

  return result;
}

function splitSystemAndUserFiles(files: Record<string, string>) {
  const user: Record<string, string> = {};
  const system: Record<string, string> = {};

  Object.entries(files).forEach(([path, contents]) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (normalized.startsWith("/__hypertool__/")) {
      system[normalized] = contents;
    } else {
      user[normalized] = contents;
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[AI] split files -> user:', Object.keys(user), 'system:', Object.keys(system));
  }

  return { user, system };
}

function mergeWithSystemFiles(
  systemFiles: Record<string, string>,
  userFiles: Record<string, string>
): Record<string, string> {
  return {
    ...systemFiles,
    ...userFiles,
  };
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
  const { user: userFiles, system: systemFiles } = splitSystemAndUserFiles(workingFiles);
  const aiVisibleFiles = filterUserFacingFiles(userFiles);
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[AI] Working files (user):', Object.keys(userFiles));
    console.debug('[AI] Working files filtered for model:', Object.keys(aiVisibleFiles));
    console.debug('[AI] System files preserved:', Object.keys(systemFiles));
  }

  const usePatchMode = editMode === "patch";

  try {
    const provider = getProviderForModel(model, apiKey);
    const aiModel = provider.chat(model);

    const defaultPrompt = usePatchMode
      ? DEFAULT_SYSTEM_PROMPT_PATCH
      : DEFAULT_SYSTEM_PROMPT_FULL;

    const conversation = buildConversationPrompt({
      systemPrompt: systemPrompt?.trim() || defaultPrompt,
      files: aiVisibleFiles,
      messages,
    });

    if (usePatchMode) {
      // Patch mode: Generate edits instead of full files
      const result = await generatePatches({
        model: aiModel,
        conversation,
        workingFiles,
      });

      const mergedFiles = ensureSystemFiles(
        mergeWithSystemFiles(systemFiles, result.files)
      );
      return NextResponse.json({
        files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
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

      const mergedFiles = ensureSystemFiles(
        mergeWithSystemFiles(systemFiles, result.files)
      );
      return NextResponse.json({
        files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
        explanation: result.explanation,
        mode: "full",
      });
    }
  } catch (error) {
    console.error("AI SDK request failed", error);
    const fallbackUserFiles = createStubTransform(
      aiVisibleFiles,
      messages.map((m) => m.content).join("\n")
    );
    const fallback = ensureSystemFiles(
      mergeWithSystemFiles(systemFiles, fallbackUserFiles)
    );
    return NextResponse.json({
      files: fallback,
      explanation: "AI request failed; stub applied.",
    });
  }
}

// export const runtime = "nodejs";
