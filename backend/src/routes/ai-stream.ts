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

        let partialUpdateCount = 0;
        let lastExplanation = '';
        let lastEditCount = 0;
        let lastFileCount = 0;

        // Send start event
        logger.debug('Sending start event');
        await stream.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

        // Stream partial objects
        logger.debug('Starting object stream');
        for await (const partialObject of result.partialObjectStream) {
          partialUpdateCount++;

          // Log every 5th update to avoid spam
          if (partialUpdateCount % 5 === 0) {
            logger.debug(`Streamed ${partialUpdateCount} partial updates`);
          }

          // Send explanation updates as tokens
          if (partialObject.explanation && partialObject.explanation !== lastExplanation) {
            const newText = partialObject.explanation.slice(lastExplanation.length);
            if (newText) {
              await stream.write(`data: ${JSON.stringify({ type: 'token', text: newText })}\n\n`);
              lastExplanation = partialObject.explanation;
            }
          }

          // For patch mode, send progress updates about edits
          if (usePatchMode && (partialObject as any).edits) {
            const currentEditCount = (partialObject as any).edits.length;
            if (currentEditCount > lastEditCount) {
              lastEditCount = currentEditCount;
              const progressText = `Generating edit ${currentEditCount}...\n`;
              await stream.write(`data: ${JSON.stringify({ type: 'progress', text: progressText })}\n\n`);
            }
          }

          // For full mode, send progress updates about files
          if (!usePatchMode && (partialObject as any).files) {
            const currentFileCount = Object.keys((partialObject as any).files).length;
            if (currentFileCount > lastFileCount) {
              lastFileCount = currentFileCount;
              const progressText = `Generating file ${currentFileCount}...\n`;
              await stream.write(`data: ${JSON.stringify({ type: 'progress', text: progressText })}\n\n`);
            }
          }
        }

        // Get final object
        const finalObject = await result.object;

        logger.info('Streaming completed', {
          totalUpdates: partialUpdateCount,
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
            summary = `Applied ${normalizedEdits.length} ${normalizedEdits.length === 1 ? 'edit' : 'edits'} to ${affectedFiles.size} ${affectedFiles.size === 1 ? 'file' : 'files'}:\n${Array.from(affectedFiles).map(f => `  - ${f}`).join('\n')}`;
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
            summary = `Generated ${fileNames.length} ${fileNames.length === 1 ? 'file' : 'files'}:\n${fileNames.map(f => `  - ${f}`).join('\n')}`;
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
