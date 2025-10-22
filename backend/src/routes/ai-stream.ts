import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { loadBoilerplateFiles, ensureSystemFiles } from '@/lib/boilerplate';
import { AiRequestSchema, CodeEditSchema } from '@/types/ai';
import { getProviderForModel } from '@/lib/aiProviders';
import { DEFAULT_SYSTEM_PROMPT_FULL, DEFAULT_SYSTEM_PROMPT_PATCH } from '@/config/prompts';
import { buildConversationPrompt } from '@/lib/aiService';
import { normalizeFileMap } from '@/lib/fileUtils';
import { createLogger } from '@/lib/logger';
import { streamObject } from 'ai';
import { z } from 'zod';
import { applyEditsToFiles, createHistoryEntry } from '@/lib/patches';
import { getHistoryManager } from '@/lib/history';

const app = new Hono();

function filterUserFacingFiles(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const INTERNAL_PREFIX = '__hypertool__/';

  Object.entries(files).forEach(([path, contents]) => {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    if (!normalizedPath.startsWith(INTERNAL_PREFIX)) {
      result[path] = contents;
    }
  });

  return result;
}

function splitSystemAndUserFiles(files: Record<string, string>, logger?: ReturnType<typeof createLogger>) {
  const user: Record<string, string> = {};
  const system: Record<string, string> = {};

  Object.entries(files).forEach(([path, contents]) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (normalized.startsWith('/__hypertool__/')) {
      system[normalized] = contents;
    } else {
      user[normalized] = contents;
    }
  });

  logger?.debug('Split files into user and system categories', {
    userFileCount: Object.keys(user).length,
    systemFileCount: Object.keys(system).length,
  });

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

app.post('/', async (c) => {
  const requestId = `ai-stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/ai-stream', requestId);

  logger.info('AI streaming request received');

  try {
    const json = await c.req.json();
    const parsed = AiRequestSchema.safeParse(json);

    if (!parsed.success) {
      logger.warn('Invalid request body', {
        validationErrors: parsed.error.errors,
      });
      return c.json({ error: 'Invalid body' }, 400);
    }

    const { messages, model, systemPrompt, apiKey, currentFiles, editMode } = parsed.data;

    logger.info('Request validated', {
      model,
      editMode,
      messageCount: messages.length,
    });

    const boilerplate = loadBoilerplateFiles();
    const workingFiles =
      currentFiles && Object.keys(currentFiles).length > 0
        ? currentFiles
        : boilerplate;

    const { user: userFiles, system: systemFiles } = splitSystemAndUserFiles(workingFiles, logger);
    const aiVisibleFiles = filterUserFacingFiles(userFiles);

    const usePatchMode = editMode === 'patch';
    const provider = getProviderForModel(model, apiKey);
    const aiModel = provider.chat(model);

    const defaultPrompt = usePatchMode
      ? DEFAULT_SYSTEM_PROMPT_PATCH
      : DEFAULT_SYSTEM_PROMPT_FULL;

    // Build conversation prompt
    const conversation = buildConversationPrompt({
      systemPrompt: systemPrompt?.trim() || defaultPrompt,
      files: aiVisibleFiles,
      messages,
    });

    logger.info(`Starting ${usePatchMode ? 'patch' : 'full'} generation with streaming`);

    return stream(c, async (stream) => {
      try {
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        // Define schema based on mode
        const schema = usePatchMode
          ? z.object({
              edits: z.array(CodeEditSchema),
              explanation: z.string().optional(),
            })
          : z.object({
              files: z.record(z.string()),
              explanation: z.string().optional(),
            });

        const result = await streamObject({
          model: aiModel,
          schema,
          prompt: conversation,
        });

        let tokenCount = 0;
        let lastEditCount = 0;
        let lastFileCount = 0;

        // Send start event
        logger.debug('Sending start event');
        await stream.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

        // Stream using fullStream for token-level updates
        logger.debug('Starting full stream');
        for await (const part of result.fullStream) {
          // Stream text deltas (token by token)
          if (part.type === 'text-delta') {
            tokenCount++;
            await stream.write(`data: ${JSON.stringify({ type: 'token', text: part.textDelta })}\n\n`);

            // Log every 20th token
            if (tokenCount % 20 === 0) {
              logger.debug(`Streamed ${tokenCount} tokens`);
            }
          }

          // Handle partial objects for structured progress
          if (part.type === 'object' && part.object) {
            const partialObject = part.object;

            // For patch mode, send detailed edit information
            if (usePatchMode && (partialObject as any).edits) {
              const currentEdits = (partialObject as any).edits;
              const currentEditCount = currentEdits.length;

              if (currentEditCount > lastEditCount) {
                // Send info about the new edit
                const newEdit = currentEdits[currentEditCount - 1];
                if (newEdit && newEdit.filePath) {
                  let editText = `\n📝 Edit ${currentEditCount}: ${newEdit.filePath}\n`;

                  if (newEdit.type) {
                    editText += `   Type: ${newEdit.type}\n`;
                  }

                  if (newEdit.search) {
                    const searchPreview = newEdit.search.length > 100
                      ? newEdit.search.substring(0, 100) + '...'
                      : newEdit.search;
                    editText += `   Search: "${searchPreview}"\n`;
                  }

                  if (newEdit.replace) {
                    const replacePreview = newEdit.replace.length > 100
                      ? newEdit.replace.substring(0, 100) + '...'
                      : newEdit.replace;
                    editText += `   Replace: "${replacePreview}"\n`;
                  }

                  await stream.write(`data: ${JSON.stringify({ type: 'progress', text: editText })}\n\n`);
                }
                lastEditCount = currentEditCount;
              }
            }

            // For full mode, send file information
            if (!usePatchMode && (partialObject as any).files) {
              const currentFiles = (partialObject as any).files;
              const currentFileCount = Object.keys(currentFiles).length;

              if (currentFileCount > lastFileCount) {
                const fileNames = Object.keys(currentFiles);
                const newFileName = fileNames[currentFileCount - 1];

                if (newFileName) {
                  const fileContent = currentFiles[newFileName];
                  const preview = fileContent && fileContent.length > 150
                    ? fileContent.substring(0, 150) + '...'
                    : fileContent;

                  const progressText = `\n📄 File ${currentFileCount}: ${newFileName}\n   ${preview ? `Preview: ${preview.split('\n')[0]}...\n` : ''}\n`;
                  await stream.write(`data: ${JSON.stringify({ type: 'progress', text: progressText })}\n\n`);
                }
                lastFileCount = currentFileCount;
              }
            }
          }
        }

        // Get final object
        const finalObject = await result.object;

        logger.info('Streaming completed', {
          totalTokens: tokenCount,
          hasExplanation: !!finalObject.explanation,
        });

        let mergedFiles: Record<string, string>;
        let summary = finalObject.explanation || '';

        if (usePatchMode) {
          // Apply patches to working files
          const edits = (finalObject as any).edits;

          if (!edits || edits.length === 0) {
            throw new Error("No valid edits generated");
          }

          // Normalize file paths in edits
          const normalizedEdits = edits.map((edit: any) => {
            const normalizedPath = edit.filePath.startsWith('/')
              ? edit.filePath
              : `/${edit.filePath}`;
            return { ...edit, filePath: normalizedPath };
          }).filter((edit: any) => !edit.filePath.startsWith('/__hypertool__/'));

          logger.info('Applying patches', {
            editCount: normalizedEdits.length,
          });

          const patchResult = applyEditsToFiles(workingFiles, normalizedEdits);

          if (!patchResult.success) {
            throw new Error(`Failed to apply patches: ${patchResult.errors?.join(", ")}`);
          }

          // Store in history
          const historyManager = getHistoryManager();
          const historyEntry = createHistoryEntry(
            normalizedEdits,
            workingFiles,
            patchResult.files,
            finalObject.explanation
          );
          historyManager.push(historyEntry);

          mergedFiles = ensureSystemFiles(
            mergeWithSystemFiles(systemFiles, patchResult.files)
          );

          // Generate summary if no explanation provided
          if (!summary) {
            const affectedFiles = new Set(normalizedEdits.map((e: any) => e.filePath));

            // Create detailed summary with edit information
            let detailedSummary = `Applied ${normalizedEdits.length} ${normalizedEdits.length === 1 ? 'edit' : 'edits'} to ${affectedFiles.size} ${affectedFiles.size === 1 ? 'file' : 'files'}:\n\n`;

            normalizedEdits.forEach((edit: any, index: number) => {
              detailedSummary += `📝 Edit ${index + 1}: ${edit.filePath}\n`;
              detailedSummary += `   Type: ${edit.type}\n`;

              if (edit.search) {
                const searchPreview = edit.search.length > 100
                  ? edit.search.substring(0, 100) + '...'
                  : edit.search;
                detailedSummary += `   Search: "${searchPreview}"\n`;
              }

              if (edit.replace) {
                const replacePreview = edit.replace.length > 100
                  ? edit.replace.substring(0, 100) + '...'
                  : edit.replace;
                detailedSummary += `   Replace: "${replacePreview}"\n`;
              }

              detailedSummary += '\n';
            });

            summary = detailedSummary;
          }

          logger.info('Patches applied successfully', {
            historyId: historyEntry.id,
          });
        } else {
          // Full file mode
          const files = (finalObject as any).files;

          logger.info('Full file generation', {
            fileCount: Object.keys(files || {}).length,
          });

          mergedFiles = ensureSystemFiles(
            mergeWithSystemFiles(systemFiles, files)
          );

          // Generate summary if no explanation provided
          if (!summary) {
            const fileNames = Object.keys(files);

            let detailedSummary = `Generated ${fileNames.length} ${fileNames.length === 1 ? 'file' : 'files'}:\n\n`;

            fileNames.forEach((fileName, index) => {
              const fileContent = files[fileName];
              const lines = fileContent.split('\n').length;
              const chars = fileContent.length;
              const preview = fileContent.length > 150
                ? fileContent.substring(0, 150) + '...'
                : fileContent;

              detailedSummary += `📄 ${index + 1}. ${fileName}\n`;
              detailedSummary += `   Lines: ${lines}, Characters: ${chars}\n`;
              detailedSummary += `   Preview: ${preview.split('\n')[0]}...\n\n`;
            });

            summary = detailedSummary;
          }
        }

        // Send complete event with files
        logger.debug('Sending complete event with files');
        await stream.write(`data: ${JSON.stringify({
          type: 'complete',
          files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
          explanation: summary,
          mode: usePatchMode ? 'patch' : 'full'
        })}\n\n`);

        logger.info('Stream successfully closed');

      } catch (error) {
        logger.error('Streaming error', error, {
          errorType: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        await stream.write(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Streaming failed'
        })}\n\n`);
      }
    });

  } catch (error) {
    logger.error('AI streaming request failed', error);
    return c.json({ error: 'AI streaming request failed' }, 500);
  }
});

export default app;
