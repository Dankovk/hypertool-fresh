import { generateObject } from "ai";
import { z } from "zod";
import { CodeEditSchema, type CodeEdit } from "../types/ai.ts";
import { applyEditsToFiles, createHistoryEntry } from "../lib/patches.ts";
import { getHistoryManager } from "../lib/history.ts";
import type { FileMap } from "../types/studio.ts";

interface GenerateFullFilesParams {
  model: any;
  conversation: string;
}

interface GenerateFullFilesResult {
  files: FileMap;
  explanation?: string;
}

interface GeneratePatchesParams {
  model: any;
  conversation: string;
  workingFiles: FileMap;
}

interface GeneratePatchesResult {
  files: FileMap;
  explanation?: string;
  edits: CodeEdit[];
  historyId: string;
}

export async function generateFullFiles({
  model,
  conversation,
}: GenerateFullFilesParams): Promise<GenerateFullFilesResult> {
  const schema = z.object({
    files: z.record(z.string()),
    explanation: z.string().optional(),
  });

  const result = await generateObject({
    model,
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
    throw new Error("AI failed to generate valid files");
  }

  return {
    files: value.files as Record<string, string>,
    explanation: typeof value.explanation === "string" ? value.explanation : undefined,
  };
}

export async function generatePatches({
  model,
  conversation,
  workingFiles,
}: GeneratePatchesParams): Promise<GeneratePatchesResult> {
  const schema = z.object({
    edits: z.array(CodeEditSchema),
    explanation: z.string().optional(),
  });

  const result = await generateObject({
    model,
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
    throw new Error("AI failed to generate valid edits");
  }

  // Validate and cast edits - zod already validated the schema
  const rawEdits = value.edits as unknown as CodeEdit[];

  const edits = rawEdits
    .map((edit) => {
      const normalizedPath = edit.filePath.startsWith('/')
        ? edit.filePath
        : `/${edit.filePath}`;
      return { ...edit, filePath: normalizedPath };
    })
    .filter((edit) => !edit.filePath.startsWith('/__hypertool__/'));

  if (edits.length === 0) {
    throw new Error("No valid edits generated");
  }

  // Apply patches
  const patchResult = applyEditsToFiles(workingFiles, edits);

  if (!patchResult.success) {
    throw new Error(`Failed to apply patches: ${patchResult.errors?.join(", ")}`);
  }

  // Store in history
  const historyManager = getHistoryManager();
  const historyEntry = createHistoryEntry(
    edits,
    workingFiles,
    patchResult.files,
    value.explanation
  );
  historyManager.push(historyEntry);

  return {
    files: patchResult.files,
    explanation: value.explanation,
    edits,
    historyId: historyEntry.id,
  };
}

interface BuildConversationParams {
  systemPrompt: string;
  files: FileMap;
  messages: Array<{ role: string; content: string }>;
}

export function buildConversationPrompt({
  systemPrompt,
  files,
  messages,
}: BuildConversationParams): string {
  const filesContext = Object.entries(files)
    .map(([path, code]) => `File: ${path}\n\`\`\`\n${code}\n\`\`\``)
    .join("\n\n");

  return [
    `System: ${systemPrompt}`,
    `\nCurrent project files:\n${filesContext}\n`,
    ...messages.map((message) => `${message.role}: ${message.content}`),
  ].join("\n\n");
}
