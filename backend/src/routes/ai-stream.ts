import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { loadBoilerplateFiles, ensureSystemFiles } from '../lib/boilerplate.ts';
import { AiRequestSchema, CodeEditSchema } from '../types/ai.ts';
import { getProviderForModel } from '../lib/aiProviders.ts';
import { DEFAULT_SYSTEM_PROMPT_FULL, DEFAULT_SYSTEM_PROMPT_PATCH } from '../config/prompts.ts';
import { buildConversationPrompt } from '../lib/aiService.ts';
import { normalizeFileMap } from '../lib/fileUtils.ts';
import { createLogger } from '../lib/logger.ts';
import { streamObject, streamText } from 'ai';
import { z } from 'zod';
import { applyEditsToFiles, createHistoryEntry } from '../lib/patches.ts';
import { getHistoryManager } from '../lib/history.ts';

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

        // Add instruction to output explanation first, then JSON
        const streamingPrompt = usePatchMode
          ? `${conversation}\n\nIMPORTANT: First explain your changes in plain text, then output a JSON object with this exact structure:\n{"edits": [{"type": "search-replace", "filePath": "/path", "search": "old code", "replace": "new code"}], "explanation": "optional"}`
          : `${conversation}\n\nIMPORTANT: First explain your changes in plain text, then output a JSON object with this exact structure:\n{"files": {"/path": "content"}, "explanation": "optional"}`;

        const result = await streamText({
          model: aiModel,
          prompt: streamingPrompt,
          temperature: 0.7,
        });

        let tokenCount = 0;
        let fullText = '';

        // Send start event
        logger.debug('Sending start event');
        await stream.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

        // Stream text token by token
        logger.debug('Starting text stream');
        for await (const chunk of result.textStream) {
          tokenCount++;
          fullText += chunk;

          // Stream every token to frontend
          await stream.write(`data: ${JSON.stringify({ type: 'token', text: chunk })}\n\n`);

          // Log every 50th token
          if (tokenCount % 50 === 0) {
            logger.debug(`Streamed ${tokenCount} tokens, ${fullText.length} chars`);
          }
        }

        logger.info('Streaming completed', {
          totalTokens: tokenCount,
          totalChars: fullText.length,
        });

        // Parse JSON from the response
        let finalObject: any = {};
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          try {
            finalObject = JSON.parse(jsonMatch[0]);
            logger.debug('Parsed JSON from response', {
              hasEdits: !!finalObject.edits,
              hasFiles: !!finalObject.files,
              editCount: finalObject.edits?.length,
              fileCount: finalObject.files ? Object.keys(finalObject.files).length : 0,
            });
          } catch (err) {
            logger.error('Failed to parse JSON from response', err);
            throw new Error('Failed to parse AI response');
          }
        } else {
          logger.error('No JSON found in response');
          throw new Error('No structured data in AI response');
        }

        let mergedFiles: Record<string, string>;
        let summary = finalObject.explanation || fullText;

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
