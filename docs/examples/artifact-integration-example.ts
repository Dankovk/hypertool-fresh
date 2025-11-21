/**
 * Example: Integrating Bolt.diy-style Artifacts into ai-stream.ts
 *
 * This shows how to modify backend/src/routes/ai-stream.ts to support
 * both the new artifact mode and the existing patch/full file modes.
 */

import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { streamText } from 'ai';
import { getHyperFramePrompt, parseArtifacts, artifactToFileMap, type BoltArtifact } from '../prompts/prompt.js';
import {
  DEFAULT_SYSTEM_PROMPT_PATCH,
  DEFAULT_SYSTEM_PROMPT_FULL
} from '@hypertool/shared-config/prompts.js';

const app = new Hono();

// Define edit mode type
type EditMode = 'artifact' | 'patch' | 'full';

app.post('/', async (c) => {
  try {
    const json = await c.req.json();
    const { messages, model, apiKey, currentFiles, editMode } = json;

    // Default to 'artifact' mode for new implementation
    const mode: EditMode = editMode || 'artifact';

    // Select appropriate system prompt based on mode
    const systemPrompt = mode === 'artifact'
      ? getHyperFramePrompt()
      : mode === 'patch'
        ? DEFAULT_SYSTEM_PROMPT_PATCH
        : DEFAULT_SYSTEM_PROMPT_FULL;

    // Get AI provider
    const provider = getProviderForModel(model, apiKey);
    const aiModel = provider.chat(model);

    // Build conversation prompt
    const conversation = buildConversationPrompt({
      systemPrompt,
      files: currentFiles,
      messages,
    });

    return stream(c, async (stream) => {
      try {
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        const startEvent = { type: 'start', mode };
        await stream.write(`data: ${JSON.stringify(startEvent)}\n\n`);

        // Stream AI response
        const result = await streamText({
          model: aiModel,
          prompt: conversation,
          temperature: 0.7,
        });

        // Accumulate full response
        let fullText = '';
        for await (const chunk of result.textStream) {
          fullText += chunk;

          // Stream tokens to frontend for display
          const tokenEvent = { type: 'token', text: chunk };
          await stream.write(`data: ${JSON.stringify(tokenEvent)}\n\n`);
          process.stdout.write(chunk);
        }

        console.log('\n[Stream] Complete, processing response...');

        // Process based on mode
        if (mode === 'artifact') {
          // ===== ARTIFACT MODE =====
          await handleArtifactMode(fullText, currentFiles, stream);
        } else {
          // ===== LEGACY PATCH/FULL MODE =====
          await handleLegacyMode(fullText, mode, currentFiles, stream);
        }

      } catch (error) {
        console.error('[Stream] Error:', error);
        const errorEvent = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Streaming failed'
        };
        await stream.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      }
    });

  } catch (error) {
    console.error('[AI] Request failed:', error);
    return c.json({
      error: 'AI request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Handle artifact mode: Parse XML artifacts and extract files/commands
 */
async function handleArtifactMode(
  fullText: string,
  currentFiles: Record<string, string>,
  stream: any
) {
  // Parse artifacts from AI response
  const artifacts = parseArtifacts(fullText);

  if (artifacts.length === 0) {
    // No artifacts found - might be plain text response
    // Fall back to showing the text as explanation
    const completeEvent = {
      type: 'complete',
      mode: 'artifact',
      explanation: fullText,
      files: currentFiles, // Keep existing files
    };
    await stream.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
    return;
  }

  // Use first artifact (typically there's only one)
  const artifact = artifacts[0];
  console.log(`[Artifact] Processing: ${artifact.title} (${artifact.id})`);

  // Extract files from artifact
  const newFiles = artifactToFileMap(artifact);

  // Merge with system files (preserve __hypertool__/ files)
  const systemFiles = Object.entries(currentFiles)
    .filter(([path]) => path.startsWith('/__hypertool__/'))
    .reduce((acc, [path, content]) => ({ ...acc, [path]: content }), {});

  const mergedFiles = {
    ...systemFiles,
    ...newFiles,
  };

  // Extract shell commands
  const shellActions = artifact.actions.filter(action => action.type === 'shell');
  const shellCommands = shellActions.map(action => action.content || '');

  // Extract explanation from markdown or create summary
  const explanationMatch = fullText.match(/^(.*?)<boltArtifact/s);
  const explanation = explanationMatch
    ? explanationMatch[1].trim()
    : `Created ${artifact.title} with ${Object.keys(newFiles).length} files`;

  // Send complete event
  const completeEvent = {
    type: 'complete',
    mode: 'artifact',
    files: mergedFiles,
    shellCommands,
    explanation,
    artifact: {
      id: artifact.id,
      title: artifact.title,
      actionCount: artifact.actions.length,
      fileCount: newFiles.length,
      shellCount: shellCommands.length,
    },
  };

  await stream.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
  console.log('[Artifact] Complete:', {
    files: Object.keys(newFiles).length,
    shellCommands: shellCommands.length,
  });

  // Optionally log shell commands for debugging
  if (shellCommands.length > 0) {
    console.log('[Shell] Commands:', shellCommands);
  }
}

/**
 * Handle legacy patch/full mode: Extract JSON and apply patches
 */
async function handleLegacyMode(
  fullText: string,
  mode: EditMode,
  currentFiles: Record<string, string>,
  stream: any
) {
  // Extract JSON from response
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No structured data in AI response');
  }

  const parsedData = JSON.parse(jsonMatch[0]);

  if (mode === 'patch') {
    // Apply patches (existing logic)
    const { edits, explanation } = parsedData;

    // Apply edits to files (use existing patch system)
    const patchResult = applyEditsToFiles(currentFiles, edits);

    const completeEvent = {
      type: 'complete',
      mode: 'patch',
      files: patchResult.files,
      explanation,
    };
    await stream.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
  } else {
    // Full file mode (existing logic)
    const { files, explanation } = parsedData;

    const completeEvent = {
      type: 'complete',
      mode: 'full',
      files,
      explanation,
    };
    await stream.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
  }
}

export default app;

/**
 * Usage in Frontend:
 *
 * // In your AI streaming hook/component:
 *
 * const eventSource = new EventSource('/api/ai/stream', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     messages,
 *     model,
 *     editMode: 'artifact', // or 'patch' or 'full'
 *     currentFiles,
 *   }),
 * });
 *
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *
 *   switch (data.type) {
 *     case 'start':
 *       console.log('Streaming started in mode:', data.mode);
 *       break;
 *
 *     case 'token':
 *       // Append token to display
 *       setStreamedText(prev => prev + data.text);
 *       break;
 *
 *     case 'complete':
 *       // Update files
 *       setFiles(data.files);
 *
 *       // Show explanation
 *       setExplanation(data.explanation);
 *
 *       // Handle shell commands (if artifact mode)
 *       if (data.shellCommands && data.shellCommands.length > 0) {
 *         setShellCommands(data.shellCommands);
 *         // Show UI to run commands or auto-execute
 *       }
 *
 *       // Show artifact info
 *       if (data.artifact) {
 *         console.log('Artifact:', data.artifact.title);
 *       }
 *       break;
 *
 *     case 'error':
 *       console.error('Error:', data.error);
 *       break;
 *   }
 * };
 */

/**
 * Optional: Convert shell commands to CDN dependencies
 *
 * For HyperFrame, you might want to convert npm install commands
 * to CDN URLs instead of actually running them:
 */
export function convertShellToCDN(commands: string[]): string[] {
  const cdnUrls: string[] = [];

  for (const cmd of commands) {
    // Match: npm install package[@version]
    const match = cmd.match(/npm install\s+([^@\s]+)(?:@([^\s]+))?/);
    if (match) {
      const [, pkg, version] = match;
      const versionStr = version && version !== 'latest' ? `@${version}` : '';
      cdnUrls.push(`https://cdn.jsdelivr.net/npm/${pkg}${versionStr}`);
    }
  }

  return cdnUrls;
}

/**
 * Example usage of CDN conversion:
 *
 * const shellCommands = ['npm install three@latest', 'npm install d3@7.8.5'];
 * const cdnUrls = convertShellToCDN(shellCommands);
 * // ['https://cdn.jsdelivr.net/npm/three', 'https://cdn.jsdelivr.net/npm/d3@7.8.5']
 *
 * // Then inject into dependencies in HyperFrame setup:
 * window.hyperFrame.createSandbox({
 *   dependencies: cdnUrls.map(url => ({ type: 'script', url })),
 *   // ...
 * });
 */
