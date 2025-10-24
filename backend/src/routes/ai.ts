import { Hono } from 'hono';
import { loadBoilerplateFiles, ensureSystemFiles } from '../lib/boilerplate.ts';
import { AiRequestSchema } from '../types/ai.ts';
import { getProviderForModel } from '../lib/aiProviders.ts';
import { DEFAULT_SYSTEM_PROMPT_FULL, DEFAULT_SYSTEM_PROMPT_PATCH } from '../config/prompts.ts';
import {
  generateFullFiles,
  generatePatches,
  buildConversationPrompt,
} from '../lib/aiService.ts';
import { createStubTransform } from '../lib/fallbacks.ts';
import { normalizeFileMap } from '../lib/fileUtils.ts';
import { createLogger } from '../lib/logger.ts';

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
    userFiles: Object.keys(user),
    systemFiles: Object.keys(system),
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
  const requestId = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/ai', requestId);

  logger.info('AI request received');

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
      hasApiKey: !!apiKey,
      hasCustomSystemPrompt: !!systemPrompt,
      hasCurrentFiles: !!(currentFiles && Object.keys(currentFiles).length > 0),
    });

    const endTimer = logger.time('AI request processing');

    const boilerplate = loadBoilerplateFiles();
    const workingFiles =
      currentFiles && Object.keys(currentFiles).length > 0
        ? currentFiles
        : boilerplate;

    logger.debug('Loaded working files', {
      source: currentFiles && Object.keys(currentFiles).length > 0 ? 'currentFiles' : 'boilerplate',
      totalFiles: Object.keys(workingFiles).length,
    });

    const { user: userFiles, system: systemFiles } = splitSystemAndUserFiles(workingFiles, logger);
    const aiVisibleFiles = filterUserFacingFiles(userFiles);

    logger.debug('Prepared files for AI processing', {
      userFileCount: Object.keys(userFiles).length,
      aiVisibleFileCount: Object.keys(aiVisibleFiles).length,
      systemFileCount: Object.keys(systemFiles).length,
      userFiles: Object.keys(userFiles),
      aiVisibleFiles: Object.keys(aiVisibleFiles),
      systemFiles: Object.keys(systemFiles),
    });

    const usePatchMode = editMode === 'patch';

    logger.info(`Using ${usePatchMode ? 'patch' : 'full'} generation mode`);

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

    logger.debug('Built conversation prompt', {
      conversationLength: conversation.length,
      usingDefaultPrompt: !systemPrompt?.trim(),
    });

    if (usePatchMode) {
      logger.info('Starting patch generation');
      const result = await generatePatches({
        model: aiModel,
        conversation,
        workingFiles,
      });

      logger.info('Patch generation completed', {
        editCount: result.edits?.length || 0,
        historyId: result.historyId,
        modifiedFiles: Object.keys(result.files).length,
      });

      const mergedFiles = ensureSystemFiles(
        mergeWithSystemFiles(systemFiles, result.files)
      );

      endTimer();

      return c.json({
        files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
        explanation: result.explanation,
        edits: result.edits,
        historyId: result.historyId,
        mode: 'patch',
      });
    } else {
      logger.info('Starting full file generation');
      const result = await generateFullFiles({
        model: aiModel,
        conversation,
      });

      logger.info('Full file generation completed', {
        fileCount: Object.keys(result.files).length,
        files: Object.keys(result.files),
      });

      const mergedFiles = ensureSystemFiles(
        mergeWithSystemFiles(systemFiles, result.files)
      );

      endTimer();

      return c.json({
        files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
        explanation: result.explanation,
        mode: 'full',
      });
    }
  } catch (error) {
    logger.error('AI SDK request failed', error, {
      errorType: error instanceof Error ? error.name : typeof error,
    });

    try {
      const json = await c.req.json();
      const parsed = AiRequestSchema.safeParse(json);
      if (parsed.success) {
        const { messages, currentFiles } = parsed.data;
        const boilerplate = loadBoilerplateFiles();
        const workingFiles =
          currentFiles && Object.keys(currentFiles).length > 0
            ? currentFiles
            : boilerplate;
        const { user: userFiles, system: systemFiles } = splitSystemAndUserFiles(workingFiles);
        const aiVisibleFiles = filterUserFacingFiles(userFiles);

        logger.warn('Applying fallback stub transformation');
        const fallbackUserFiles = createStubTransform(
          aiVisibleFiles,
          messages.map((m) => m.content).join('\n')
        );
        const fallback = ensureSystemFiles(
          mergeWithSystemFiles(systemFiles, fallbackUserFiles)
        );

        return c.json({
          files: fallback,
          explanation: 'AI request failed; stub applied.',
        });
      }
    } catch (fallbackError) {
      logger.error('Fallback generation also failed', fallbackError);
    }

    return c.json({ error: 'AI request failed' }, 500);
  }
});

export default app;
