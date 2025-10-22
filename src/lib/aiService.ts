import { generateObject } from "ai";
import { z } from "zod";
import { CodeEditSchema, type CodeEdit } from "@/types/ai";
import { applyEditsToFiles, createHistoryEntry } from "@/lib/patches";
import { getHistoryManager } from "@/lib/history";
import type { FileMap } from "@/types/studio";
import { createLogger } from "@/lib/logger";

const logger = createLogger('aiService');

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
  logger.info('Starting full file generation');
  logger.debug('Generation parameters', {
    conversationLength: conversation.length,
    modelInfo: model?.modelId || 'unknown',
  });

  const schema = z.object({
    files: z.record(z.string()),
    explanation: z.string().optional(),
  });

  const endTimer = logger.time('AI full file generation');

  try {
    const result = await generateObject({
      model,
      schema,
      prompt: conversation,
    });

    endTimer();

    const value = result.object;
    if (
      !value ||
      typeof value !== "object" ||
      !value.files ||
      typeof value.files !== "object"
    ) {
      logger.error('AI generated invalid response structure', undefined, {
        hasValue: !!value,
        valueType: typeof value,
        hasFiles: !!(value as any)?.files,
        filesType: typeof (value as any)?.files,
      });
      throw new Error("AI failed to generate valid files");
    }

    logger.info('Full file generation completed successfully', {
      fileCount: Object.keys(value.files).length,
      files: Object.keys(value.files),
      hasExplanation: !!value.explanation,
    });

    return {
      files: value.files as Record<string, string>,
      explanation: typeof value.explanation === "string" ? value.explanation : undefined,
    };
  } catch (error) {
    logger.error('Full file generation failed', error);
    throw error;
  }
}

export async function generatePatches({
  model,
  conversation,
  workingFiles,
}: GeneratePatchesParams): Promise<GeneratePatchesResult> {
  logger.info('Starting patch generation');
  logger.debug('Generation parameters', {
    conversationLength: conversation.length,
    workingFileCount: Object.keys(workingFiles).length,
    modelInfo: model?.modelId || 'unknown',
  });

  const schema = z.object({
    edits: z.array(CodeEditSchema),
    explanation: z.string().optional(),
  });

  const endTimer = logger.time('AI patch generation');

  try {
    const result = await generateObject({
      model,
      schema,
      prompt: conversation,
    });

    endTimer();

    const value = result.object;

    // Additional validation: Check if any edits have issues before processing
    if (value?.edits && Array.isArray(value.edits)) {
      const invalidEdits = value.edits.filter((edit: any, index: number) => {
        if (edit.type === 'search-replace') {
          const isInvalid = !edit.search || !edit.replace ||
                           edit.search.length === 0 || edit.replace.length === 0;
          if (isInvalid) {
            logger.error(`Invalid search-replace edit at index ${index}`, undefined, {
              editIndex: index,
              filePath: edit.filePath,
              hasSearch: !!edit.search,
              hasReplace: !!edit.replace,
              searchLength: edit.search?.length || 0,
              replaceLength: edit.replace?.length || 0,
              fullEdit: JSON.stringify(edit),
            });
          }
          return isInvalid;
        }
        if (edit.type === 'unified-diff') {
          const isInvalid = !edit.diff || edit.diff.length === 0;
          if (isInvalid) {
            logger.error(`Invalid unified-diff edit at index ${index}`, undefined, {
              editIndex: index,
              filePath: edit.filePath,
              hasDiff: !!edit.diff,
              diffLength: edit.diff?.length || 0,
              fullEdit: JSON.stringify(edit),
            });
          }
          return isInvalid;
        }
        return false;
      });

      if (invalidEdits.length > 0) {
        throw new Error(`AI generated ${invalidEdits.length} invalid edit(s). Check logs for details.`);
      }
    }

    if (
      !value ||
      typeof value !== "object" ||
      !value.edits ||
      !Array.isArray(value.edits)
    ) {
      logger.error('AI generated invalid edits structure', undefined, {
        hasValue: !!value,
        valueType: typeof value,
        hasEdits: !!(value as any)?.edits,
        editsType: typeof (value as any)?.edits,
        isArray: Array.isArray((value as any)?.edits),
      });
      throw new Error("AI failed to generate valid edits");
    }

    // Validate and cast edits - zod already validated the schema
    const rawEdits = value.edits as unknown as CodeEdit[];

    logger.debug('Processing generated edits', {
      rawEditCount: rawEdits.length,
    });

    // Log each edit for debugging
    rawEdits.forEach((edit, index) => {
      logger.debug(`Raw edit ${index + 1}/${rawEdits.length}`, {
        editIndex: index,
        filePath: edit.filePath,
        type: edit.type,
        hasSearch: !!(edit as any).search,
        hasReplace: !!(edit as any).replace,
        hasDiff: !!(edit as any).diff,
        searchLength: (edit as any).search?.length || 0,
        replaceLength: (edit as any).replace?.length || 0,
        diffLength: (edit as any).diff?.length || 0,
      });
    });

    const edits = rawEdits
      .map((edit) => {
        const normalizedPath = edit.filePath.startsWith('/')
          ? edit.filePath
          : `/${edit.filePath}`;
        return { ...edit, filePath: normalizedPath };
      })
      .filter((edit) => !edit.filePath.startsWith('/__hypertool__/'));

    logger.debug('Filtered and normalized edits', {
      filteredEditCount: edits.length,
      removedSystemFileEdits: rawEdits.length - edits.length,
      affectedFiles: [...new Set(edits.map(e => e.filePath))],
    });

    if (edits.length === 0) {
      logger.warn('No valid edits generated after filtering');
      throw new Error("No valid edits generated");
    }

    // Apply patches
    logger.info('Applying edits to files', {
      editCount: edits.length,
    });

    const patchResult = applyEditsToFiles(workingFiles, edits);

    if (!patchResult.success) {
      logger.error('Failed to apply patches', undefined, {
        errors: patchResult.errors,
      });
      throw new Error(`Failed to apply patches: ${patchResult.errors?.join(", ")}`);
    }

    logger.info('Patches applied successfully', {
      modifiedFileCount: Object.keys(patchResult.files).length,
    });

    // Store in history
    const historyManager = getHistoryManager();
    const historyEntry = createHistoryEntry(
      edits,
      workingFiles,
      patchResult.files,
      value.explanation
    );
    historyManager.push(historyEntry);

    logger.info('Patch generation completed and stored in history', {
      historyId: historyEntry.id,
      editCount: edits.length,
      hasExplanation: !!value.explanation,
    });

    return {
      files: patchResult.files,
      explanation: value.explanation,
      edits,
      historyId: historyEntry.id,
    };
  } catch (error) {
    logger.error('Patch generation failed', error);
    throw error;
  }
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
  logger.debug('Building conversation prompt', {
    fileCount: Object.keys(files).length,
    messageCount: messages.length,
    systemPromptLength: systemPrompt.length,
  });

  const filesContext = Object.entries(files)
    .map(([path, code]) => `File: ${path}\n\`\`\`\n${code}\n\`\`\``)
    .join("\n\n");

  const prompt = [
    `System: ${systemPrompt}`,
    `\nCurrent project files:\n${filesContext}\n`,
    ...messages.map((message) => `${message.role}: ${message.content}`),
  ].join("\n\n");

  logger.debug('Conversation prompt built', {
    totalPromptLength: prompt.length,
    filesContextLength: filesContext.length,
  });

  return prompt;
}
