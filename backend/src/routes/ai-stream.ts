//@ts-nocheck
import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { loadBoilerplateFromConvex, ensureSystemFiles } from '../lib/boilerplate.js';
import { AiRequestSchema, CodeEditSchema } from '../types/ai.js';
import { getProviderForModel } from '../lib/aiProviders.js';
import {
  DEFAULT_SYSTEM_PROMPT_FULL,
  DEFAULT_SYSTEM_PROMPT_PATCH,
  GEMINI_SYSTEM_PROMPT_FULL,
  GEMINI_SYSTEM_PROMPT_PATCH,
} from '@hypertool/shared-config/prompts.js';
import { buildConversationPrompt } from '../lib/aiService.js';
import { normalizeFileMap } from '../lib/fileUtils.js';
import { createLogger } from '../lib/logger.js';
import { streamObject, streamText } from 'ai';
import { z } from 'zod';
import { applyEditsToFiles, createHistoryEntry } from '../lib/patches.js';
import { getHistoryManager } from '../lib/history.js';

const app = new Hono();

// ===== GEMINI DETECTION & SCHEMAS =====

/**
 * Check if the model is a Gemini model
 */
function isGeminiModel(model: string): boolean {
  const isGemini = model.toLowerCase().includes('gemini');
  return isGemini;
}

/**
 * Zod schema for patch mode edits
 */
const PatchModeSchema = z.object({
  edits: z.array(
    z.object({
      type: z.literal('search-replace').describe('The type of edit operation - must be "search-replace"'),
      filePath: z.string().min(1).describe('The file path to edit, starting with / (e.g., "/main.ts", "/index.html"). REQUIRED.'),
      search: z.string().min(10).describe('EXACT code to find - ABSOLUTELY REQUIRED, MUST NOT BE EMPTY. Must be at least 10 characters. Must match character-for-character including ALL whitespace, tabs, spaces, and newlines. Copy the exact text from the file without any modifications. Include 2-3 lines of context to make the match unique.'),
      replace: z.string().describe('The new code to replace the search string with. REQUIRED but can be empty string for deletions. Can have different whitespace than search.'),
    })
  ).min(1).describe('Array of search-replace edits to apply to files. Must have at least one edit. Each edit MUST have a non-empty search string of at least 10 characters.'),
  explanation: z.string().optional().describe('Optional human-readable explanation of what changes were made and why'),
});

/**
 * Zod schema for full file mode
 */
const FullFileModeSchema = z.object({
  files: z.record(z.string(), z.string()).describe('Complete file map with file paths as keys and content as values'),
  explanation: z.string().optional().describe('Optional explanation of the changes made'),
});

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

function splitSystemAndUserFiles(files: Record<string, string>) {
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

  try {
    // Parse and validate request
    const json = await c.req.json();
    const parsed = AiRequestSchema.safeParse(json);

    if (!parsed.success) {
      logger.warn('Invalid request body', { validationErrors: parsed.error.errors });
      return c.json({ error: 'Invalid body' }, 400);
    }

    const { messages, model, systemPrompt, apiKey, currentFiles, editMode } = parsed.data;

    // Load files and split into user-visible and system files
    // Load boilerplate from Convex DB (defaults to 'universal')
    const boilerplate = await loadBoilerplateFromConvex();
    const workingFiles = currentFiles && Object.keys(currentFiles).length > 0
      ? currentFiles
      : boilerplate;

    const { user: userFiles, system: systemFiles } = splitSystemAndUserFiles(workingFiles);
    const aiVisibleFiles = filterUserFacingFiles(userFiles);

    // Determine mode and model configuration
    const usePatchMode = editMode === 'patch';
    const useGemini = isGeminiModel(model);
    const provider = getProviderForModel(model, apiKey);
    const aiModel = provider.chat(model);

    // Select appropriate system prompt based on model and edit mode
    const defaultPrompt = useGemini
      ? (usePatchMode ? GEMINI_SYSTEM_PROMPT_PATCH : GEMINI_SYSTEM_PROMPT_FULL)
      : (usePatchMode ? DEFAULT_SYSTEM_PROMPT_PATCH : DEFAULT_SYSTEM_PROMPT_FULL);

    const conversation = buildConversationPrompt({
      systemPrompt: systemPrompt?.trim() || defaultPrompt,
      files: aiVisibleFiles,
      messages,
    });

    return stream(c, async (stream) => {
      try {
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        let finalObject: any = {};

        // ===== GEMINI: Use streamObject for structured output with Zod validation =====
        if (useGemini) {
          const schema = usePatchMode ? PatchModeSchema : FullFileModeSchema;
          const schemaName = usePatchMode ? 'CodeEdits' : 'FileMap';

          await stream.write(`data: ${JSON.stringify({ type: 'start', provider: 'gemini' })}\n\n`);

          const result = await streamObject({
            model: aiModel,
            schema,
            schemaName,
            schemaDescription: usePatchMode
              ? 'Search-replace edits to apply to existing files'
              : 'Complete file map with all project files',
            prompt: conversation,
            mode: 'json',
            temperature: 0.7,
          });

          // Stream progress updates to frontend
          let updateCount = 0;
          for await (const partialObject of result.partialObjectStream) {
            updateCount++;
            await stream.write(`data: ${JSON.stringify({ 
              type: 'progress', 
              text: `Generating structured output... (update ${updateCount})`,
              provider: 'gemini',
            })}\n\n`);
          }

          // Get final validated object
          finalObject = await result.object;

        }
        // ===== CLAUDE/OTHER: Use streamText and parse JSON from response =====
        else {
          // Add JSON structure instruction to prompt
          const streamingPrompt = usePatchMode
            ? `${conversation}\n\nIMPORTANT: First explain your changes in plain text, then output a JSON object with this exact structure:\n{"edits": [{"type": "search-replace", "filePath": "/path", "search": "old code", "replace": "new code"}], "explanation": "optional"}`
            : `${conversation}\n\nIMPORTANT: First explain your changes in plain text, then output a JSON object with this exact structure:\n{"files": {"/path": "content"}, "explanation": "optional"}`;

          const result = await streamText({
            model: aiModel,
            prompt: streamingPrompt,
            temperature: 0.7,
          });

          await stream.write(`data: ${JSON.stringify({ type: 'start', provider: 'claude' })}\n\n`);

          // Stream tokens to frontend
          let fullText = '';
          for await (const chunk of result.textStream) {
            fullText += chunk;
            await stream.write(`data: ${JSON.stringify({ type: 'token', text: chunk, provider: 'claude' })}\n\n`);
          }

          // Extract and parse JSON from response
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No structured data in AI response');
          }

          try {
            finalObject = JSON.parse(jsonMatch[0]);
          } catch (err) {
            logger.error('Failed to parse JSON from AI response', err);
            throw new Error('Failed to parse AI response');
          }
        }

        // ===== PROCESS RESULTS =====
        let mergedFiles: Record<string, string>;
        let summary = finalObject.explanation || '';

        if (usePatchMode) {
          // ===== PATCH MODE: Apply search-replace edits =====
          const edits = (finalObject as any).edits;

          if (!edits || edits.length === 0) {
            throw new Error("No valid edits generated");
          }

          // Normalize file paths (add leading slash) and filter system files
          const normalizedEdits = edits
            .map((edit: any) => ({
              ...edit,
              filePath: edit.filePath.startsWith('/') ? edit.filePath : `/${edit.filePath}`
            }))
            .filter((edit: any) => !edit.filePath.startsWith('/__hypertool__/'));

          // Validate edits: filter out those with empty search strings or undefined replace
          const invalidEdits: any[] = [];
          const validEdits = normalizedEdits.filter((edit: any, index: number) => {
            // Search string must be non-empty
            if (!edit.search || typeof edit.search !== 'string' || edit.search.trim() === '') {
              invalidEdits.push({
                index: index + 1,
                reason: 'Empty or missing search string',
                filePath: edit.filePath
              });
              return false;
            }

            // Replace must be defined (can be empty string for deletions)
            if (edit.replace === undefined || edit.replace === null) {
              invalidEdits.push({
                index: index + 1,
                reason: 'Undefined replace string',
                filePath: edit.filePath
              });
              return false;
            }

            return true;
          });

          // Log validation results if there were invalid edits
          if (invalidEdits.length > 0) {
            logger.warn('Filtered invalid edits', {
              valid: validEdits.length,
              invalid: invalidEdits.length,
              invalidEdits
            });
          }

          // Fail if all edits are invalid
          if (validEdits.length === 0) {
            throw new Error(`All ${edits.length} edits are invalid (missing search strings). Try simplifying your request or using Full File mode.`);
          }

          const patchResult = applyEditsToFiles(workingFiles, validEdits);

          const successfulEdits = patchResult.results.filter(r => r.success).length;
          const failedEdits = patchResult.results.filter(r => !r.success).length;

          if (patchResult.success === false && successfulEdits === 0) {
            logger.error('All patches failed to apply', { errors: patchResult.errors });
            throw new Error(`Failed to apply all patches: ${patchResult.errors?.join(", ")}`);
          }

          if (successfulEdits > 0 && failedEdits > 0) {
            await stream.write(`data: ${JSON.stringify({
              type: 'warning',
              message: `Partial success: ${successfulEdits} of ${validEdits.length} edits applied. ${failedEdits} failed.${invalidEdits.length > 0 ? ` (${invalidEdits.length} invalid filtered)` : ''}`,
              details: {
                successful: successfulEdits,
                failed: failedEdits,
                invalid: invalidEdits.length,
                total: validEdits.length,
              }
            })}\n\n`);
          }

          const historyManager = getHistoryManager();
          const historyEntry = createHistoryEntry(
            validEdits,
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
          const files = (finalObject as any).files;

          if (!files || Object.keys(files).length === 0) {
            throw new Error("No files generated");
          }

          mergedFiles = ensureSystemFiles(
            mergeWithSystemFiles(systemFiles, files)
          );

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

        await stream.write(`data: ${JSON.stringify({
          type: 'complete',
          files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
          explanation: summary,
          mode: usePatchMode ? 'patch' : 'full',
          provider: useGemini ? 'gemini' : 'claude',
        })}\n\n`);

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({
      error: 'AI streaming request failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export default app;
