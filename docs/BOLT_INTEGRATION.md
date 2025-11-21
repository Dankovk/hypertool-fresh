# Bolt.diy-Style Artifact System Integration Guide

This document explains how to integrate the new bolt.diy-style artifact system into HyperFrame, enabling more sophisticated AI interactions with file operations, dependency management, and shell commands.

## Overview

The artifact system allows the AI to respond with structured XML containing multiple actions (file creations, shell commands, etc.) in a single response, similar to how bolt.diy works. This replaces the simple patch-based system with a more powerful workflow.

## Changes Made

### 1. New Prompt System (`backend/src/prompts/prompt.ts`)

The new `getHyperFramePrompt()` function creates a comprehensive prompt that:
- Teaches the AI about HyperFrame's universal sandbox API
- Uses bolt.diy's artifact/action XML structure
- Supports creative coding frameworks (p5.js, Three.js, etc.)
- Includes detailed examples and best practices

**Key exports:**
```typescript
export const getHyperFramePrompt = () => `...`; // Main prompt
export const CONTINUE_PROMPT = `...`; // For continuation
export const getFineTunedPrompt = getHyperFramePrompt; // Backwards compatibility

// Parsing utilities
export function parseArtifacts(text: string): BoltArtifact[];
export function artifactToFileMap(artifact: BoltArtifact): Record<string, string>;
```

### 2. Artifact Structure

AI responses will contain XML artifacts like this:

```xml
<boltArtifact id="particle-system" title="Particle System with p5.js">
  <boltAction type="file" filePath="/main.ts" contentType="text/typescript">
    window.hyperFrame.createSandbox({
      dependencies: [
        { type: 'script', url: 'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js' }
      ],
      setup(context) {
        // User code here
      }
    });
  </boltAction>

  <boltAction type="file" filePath="/index.html" contentType="text/html">
    <!DOCTYPE html>
    <html>
      <body>
        <script type="module" src="/main.ts"></script>
      </body>
    </html>
  </boltAction>

  <boltAction type="shell">
    npm install three@latest --yes
  </boltAction>
</boltArtifact>
```

### 3. Action Types

| Type | Purpose | Attributes | Example |
|------|---------|------------|---------|
| `file` | Create/update files | `filePath`, `contentType` | Creating source files |
| `shell` | Run commands | None | Installing dependencies |
| `start` | Start/refresh preview | None | Trigger reload |

## Integration Steps

### Step 1: Update AI Streaming Route

Modify `/backend/src/routes/ai-stream.ts` to detect and parse artifacts:

```typescript
import { getHyperFramePrompt, parseArtifacts, artifactToFileMap } from '../prompts/prompt.js';

// In your streaming handler:
const systemPrompt = getHyperFramePrompt();

// After receiving AI response:
let fullText = '';
for await (const chunk of result.textStream) {
  fullText += chunk;
  // Stream to frontend...
}

// Parse artifacts from response
const artifacts = parseArtifacts(fullText);

if (artifacts.length > 0) {
  const artifact = artifacts[0]; // Use first artifact

  // Extract files
  const files = artifactToFileMap(artifact);

  // Extract shell commands
  const shellCommands = artifact.actions
    .filter(action => action.type === 'shell')
    .map(action => action.content);

  // Send to frontend
  const completeEvent = {
    type: 'complete',
    files,
    shellCommands,
    artifactId: artifact.id,
    artifactTitle: artifact.title,
  };

  await stream.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
}
```

### Step 2: Add Dual Mode Support

Support both artifact mode and legacy patch mode:

```typescript
// Detect if response contains artifacts
const hasArtifacts = fullText.includes('<boltArtifact');

if (hasArtifacts) {
  // Use artifact parser
  const artifacts = parseArtifacts(fullText);
  // Process artifacts...
} else {
  // Fall back to existing patch/full file mode
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  const parsedData = JSON.parse(jsonMatch[0]);
  // Existing logic...
}
```

### Step 3: Update Frontend to Handle Artifacts

In your frontend streaming handler (`frontend/src/hooks/useAIStream.ts` or similar):

```typescript
interface StreamEvent {
  type: 'start' | 'token' | 'complete' | 'error';
  files?: Record<string, string>;
  shellCommands?: string[];
  artifactId?: string;
  artifactTitle?: string;
}

eventSource.onmessage = (event) => {
  const data: StreamEvent = JSON.parse(event.data);

  if (data.type === 'complete') {
    // Update files
    if (data.files) {
      setFiles(data.files);
    }

    // Display shell commands (for now, just show them)
    if (data.shellCommands && data.shellCommands.length > 0) {
      console.log('Shell commands to run:', data.shellCommands);
      // TODO: Implement shell command execution
    }

    // Show artifact info
    if (data.artifactId) {
      console.log(`Artifact: ${data.artifactTitle} (${data.artifactId})`);
    }
  }
};
```

### Step 4: WebContainer Integration for Shell Command Execution

Shell commands must be executed in WebContainer. Here's how:

1. **Frontend WebContainer Setup**:
```typescript
// In your editor component or context
import { WebContainer } from '@webcontainer/api';
import { useEffect, useState } from 'react';

export function useWebContainer() {
  const [container, setContainer] = useState<WebContainer | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootContainer() {
      const instance = await WebContainer.boot();
      if (isMounted) {
        setContainer(instance);
        setIsBooting(false);
      }
    }

    bootContainer();

    return () => {
      isMounted = false;
    };
  }, []);

  return { container, isBooting };
}
```

2. **Execute Shell Commands**:
```typescript
async function executeShellCommand(
  container: WebContainer,
  command: string,
  onOutput?: (text: string) => void
): Promise<{ exitCode: number; output: string }> {
  let output = '';

  const process = await container.spawn('sh', ['-c', command]);

  // Stream stdout
  process.output.pipeTo(
    new WritableStream({
      write(chunk) {
        output += chunk;
        onOutput?.(chunk);
      },
    })
  );

  const exitCode = await process.exit;

  return { exitCode, output };
}

// Execute multiple commands sequentially
async function executeShellCommands(
  container: WebContainer,
  commands: string[],
  onProgress?: (cmd: string, output: string) => void
) {
  const results = [];

  for (const cmd of commands) {
    console.log(`[Shell] Executing: ${cmd}`);
    const result = await executeShellCommand(container, cmd, (text) => {
      onProgress?.(cmd, text);
    });
    results.push({ command: cmd, ...result });

    // Stop if command failed
    if (result.exitCode !== 0) {
      throw new Error(`Command failed: ${cmd}\nOutput: ${result.output}`);
    }
  }

  return results;
}
```

3. **Write Files to WebContainer**:
```typescript
async function writeFilesToContainer(
  container: WebContainer,
  files: Record<string, string>
) {
  for (const [path, content] of Object.entries(files)) {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

    // Create directory if needed
    const dirPath = normalizedPath.split('/').slice(0, -1).join('/');
    if (dirPath) {
      await container.fs.mkdir(dirPath, { recursive: true });
    }

    // Write file
    await container.fs.writeFile(normalizedPath, content);
  }
}
```

### Step 5: Update Settings Store

Add a toggle for artifact mode vs patch mode:

```typescript
// In settingsStore.ts
interface SettingsState {
  editMode: 'patch' | 'artifact';
  // ... other settings
}

// When calling AI:
const body = {
  messages,
  model,
  editMode: settings.editMode, // 'patch' or 'artifact'
  systemPrompt: settings.editMode === 'artifact'
    ? getHyperFramePrompt()
    : UNIFIED_SYSTEM_PROMPT_PATCH,
  // ...
};
```

## Testing the Integration

### Test 1: Basic File Creation

**Prompt:** "Create a simple p5.js bouncing ball"

**Expected:** AI returns artifact with `/main.ts` and `/index.html` files.

### Test 2: Multi-File Project

**Prompt:** "Create a Three.js scene with a rotating cube"

**Expected:** Multiple files (main.ts, scene.ts, cube.ts, etc.)

### Test 3: Dependency Declaration

**Prompt:** "Add D3.js for data visualization"

**Expected:** Shell action with `npm install d3@latest` or dependency in `window.hyperFrame.createSandbox()`

### Test 4: Incremental Updates

**Prompt:** "Add a color control to the bouncing ball"

**Expected:** Only modified files in artifact, not entire project

## Migration Path

### Phase 1: Artifact Parsing (Current)
- ✅ New prompt system created
- ✅ Artifact parsing utilities
- ⬜ Backend integration
- ⬜ Frontend integration
- ⬜ Dual mode support

### Phase 2: Shell Commands
- ⬜ Display shell commands to user
- ⬜ Manual execution option
- ⬜ CDN conversion for dependencies
- ⬜ Automatic execution (optional)

### Phase 3: Advanced Features
- ⬜ Multi-artifact support
- ⬜ Undo/redo for artifacts
- ⬜ Artifact diffing visualization
- ⬜ Template/preset creation from artifacts

## Benefits of Artifact System

1. **Clearer Intent**: Actions are explicitly typed (file, shell, start)
2. **Better Organization**: Multiple related changes in one artifact
3. **Dependency Management**: Shell commands for npm packages
4. **Extensibility**: Easy to add new action types
5. **Compatibility**: Works alongside existing patch system
6. **Better UX**: Users see titled artifacts instead of raw patches

## Backwards Compatibility

The new system maintains compatibility:
- `getFineTunedPrompt` alias for existing code
- Dual mode detection (artifacts vs JSON patches)
- Existing patch mode still available
- Gradual migration possible

## Next Steps

1. **Immediate**: Integrate artifact parsing into `ai-stream.ts`
2. **Short-term**: Add frontend artifact display
3. **Medium-term**: Implement shell command handling
4. **Long-term**: Full WebContainer integration (if needed)

## Example: Complete Integration

See `/docs/examples/artifact-integration-example.ts` for a complete working example.

## Troubleshooting

### AI Not Using Artifacts
- Check that `getHyperFramePrompt()` is being used
- Verify system prompt is being sent correctly
- Try more explicit requests: "Use artifacts to create..."

### Parsing Errors
- Check regex in `parseArtifacts()` handles edge cases
- Validate XML structure in AI response
- Log full response for debugging

### Performance Issues
- Artifacts can be large; consider streaming file contents
- Parse incrementally if needed
- Cache parsed artifacts

## Resources

- [bolt.diy Original Implementation](https://github.com/stackblitz/bolt.diy)
- [HyperFrame API Documentation](./HYPERFRAME_API.md)
- [AI Prompt Engineering Guide](./PROMPT_ENGINEERING.md)
