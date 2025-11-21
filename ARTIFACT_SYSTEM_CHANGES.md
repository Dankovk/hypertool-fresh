# HyperTool Artifact System - Required Changes

## Summary

Add HyperTool artifact support with WebContainer shell command execution. **WebContainer is already integrated** - we just need to wire up artifact parsing and shell command execution.

**Naming Convention**: Using `hypertlArtifact` and `hypertlAction` (not "bolt").

---

## Changes Required

### 1. Backend Types (backend/src/types/ai.ts)

**Line 20:**
```typescript
// CHANGE FROM:
editMode: z.enum(["full", "patch"]).default("full").optional(),

// CHANGE TO:
editMode: z.enum(["full", "patch", "artifact"]).default("patch").optional(),
```

---

### 2. Backend AI Stream (backend/src/routes/ai-stream.ts)

**Line 7-12, add import:**
```typescript
import {
  getHyperFramePrompt,
  parseArtifacts,
  artifactToFileMap,
} from '../prompts/prompt.js';
```

**Line 110-130, after parsing request, add mode handling:**
```typescript
const { messages, model, systemPrompt, apiKey, currentFiles, editMode } = parsed.data;

const mode = editMode || 'patch'; // Default to patch

// Select prompt based on mode
const finalSystemPrompt = mode === 'artifact'
  ? getHyperFramePrompt()
  : systemPrompt?.trim() || (usePatchMode ? DEFAULT_SYSTEM_PROMPT_PATCH : DEFAULT_SYSTEM_PROMPT_FULL);
```

**Line 230-395, after streaming completes, add artifact handling:**
```typescript
// After collecting fullText from streaming...

// Check if response contains artifacts
const hasArtifacts = mode === 'artifact' || fullText.includes('<hypertlArtifact');

if (hasArtifacts) {
  const artifacts = parseArtifacts(fullText);

  if (artifacts.length > 0) {
    const artifact = artifacts[0];

    // Extract files
    const newFiles = artifactToFileMap(artifact);

    // Extract shell commands
    const shellCommands = artifact.actions
      .filter(a => a.type === 'shell')
      .map(a => a.content || '');

    // Merge with system files
    const mergedFiles = ensureSystemFiles(
      mergeWithSystemFiles(systemFiles, newFiles)
    );

    // Extract explanation
    const explanationMatch = fullText.match(/^(.*?)<hypertlArtifact/s);
    const explanation = explanationMatch?.[1]?.trim() || artifact.title;

    const completeEvent = {
      type: 'complete',
      mode: 'artifact',
      files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
      shellCommands, // NEW!
      explanation,
      artifact: {
        id: artifact.id,
        title: artifact.title,
      },
    };

    await stream.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
    return; // Exit early, don't fall through to legacy mode
  }
}

// Existing patch/full mode logic continues here...
```

---

### 3. Frontend Settings Store (frontend/src/stores/settingsStore.ts)

**Line 11-12:**
```typescript
// CHANGE FROM:
editMode: "full" | "patch";

// CHANGE TO:
editMode: "full" | "patch" | "artifact";
```

**Line 18:**
```typescript
// CHANGE FROM:
setEditMode: (editMode: "full" | "patch") => void;

// CHANGE TO:
setEditMode: (editMode: "full" | "patch" | "artifact") => void;
```

**Line 28:**
```typescript
// CHANGE FROM:
editMode: "patch",

// CHANGE TO:
editMode: "artifact", // New default!
```

---

### 4. Frontend Preview Store (NEW FILE)

**Create: `frontend/src/stores/previewStore.ts`**

```typescript
import { create } from 'zustand';

interface PreviewState {
  shellCommands: string[];
  isExecuting: boolean;
  executionLog: string[];

  setShellCommands: (commands: string[]) => void;
  clearShellCommands: () => void;
  setExecuting: (executing: boolean) => void;
  addExecutionLog: (log: string) => void;
  clearExecutionLog: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  shellCommands: [],
  isExecuting: false,
  executionLog: [],

  setShellCommands: (commands) => set({ shellCommands: commands }),
  clearShellCommands: () => set({ shellCommands: [] }),
  setExecuting: (executing) => set({ isExecuting: executing }),
  addExecutionLog: (log) => set((state) => ({
    executionLog: [...state.executionLog, log]
  })),
  clearExecutionLog: () => set({ executionLog: [] }),
}));
```

---

### 5. Frontend Store Index (frontend/src/stores/index.ts)

**Add export:**
```typescript
export { usePreviewStore } from './previewStore';
```

---

### 6. Frontend Types (frontend/src/types/studio.ts)

**Add at end of file:**
```typescript
// Streaming event types
export interface StreamEvent {
  type: 'start' | 'token' | 'progress' | 'complete' | 'warning' | 'error';
  text?: string;
  files?: Record<string, string>;
  shellCommands?: string[]; // NEW
  explanation?: string;
  mode?: 'patch' | 'full' | 'artifact'; // Add artifact
  artifact?: {
    id: string;
    title: string;
  };
  error?: string;
  message?: string;
  details?: any;
}
```

---

### 7. Frontend AI Chat Hook (frontend/src/hooks/useAIChat.ts)

**Line 1, add import:**
```typescript
import { usePreviewStore } from "@/stores";
```

**Line 143-178, in the "complete" event handler, after files are applied:**
```typescript
} else if (event.type === "complete") {
  try {
    // ... existing explanation handling

    if (event.files) {
      const parsed = FileMapSchema.safeParse(event.files);

      if (parsed.success) {
        const normalized = toClientFiles(parsed.data);
        addVersion(normalized, currentInput, model);
        setFiles(normalized);

        // NEW: Handle shell commands from artifacts
        if (event.shellCommands && event.shellCommands.length > 0) {
          usePreviewStore.getState().setShellCommands(event.shellCommands);
          console.log('[AI] Received shell commands:', event.shellCommands);
          toast.info(`${event.shellCommands.length} shell command(s) ready to execute`);
        }

        toast.success(`Files applied! (${Object.keys(event.files).length} files)`);
      }
      // ... rest of handler
    }
  }
}
```

---

### 8. Frontend Preview Panel (frontend/src/components/Preview/PreviewPanel.tsx)

**Line 1, add imports:**
```typescript
import { usePreviewStore } from "@/stores";
import { toast } from "sonner";
```

**Line 85, inside component, add store hooks:**
```typescript
// Shell command execution
const shellCommands = usePreviewStore((state) => state.shellCommands);
const clearShellCommands = usePreviewStore((state) => state.clearShellCommands);
const setExecuting = usePreviewStore((state) => state.setExecuting);
const addExecutionLog = usePreviewStore((state) => state.addExecutionLog);
```

**After line 400 (after all existing functions), add shell execution:**
```typescript
// ===== SHELL COMMAND EXECUTION =====

/**
 * Execute a single shell command in WebContainer
 */
const executeShellCommand = useCallback(async (
  command: string
): Promise<{ exitCode: number; output: string }> => {
  const container = containerRef.current;
  if (!container) {
    throw new Error('WebContainer not ready');
  }

  appendLog(`[Shell] Executing: ${command}`);
  setStatus(`Running: ${command}`);

  let output = '';

  try {
    const process = await container.spawn('sh', ['-c', command]);

    // Pipe output to terminal
    await pipeProcessOutput(process.output, 'shell');

    const exitCode = await process.exit;

    if (exitCode === 0) {
      appendLog(`[Shell] ✓ Command completed successfully`);
    } else {
      appendLog(`[Shell] ✗ Command failed with exit code ${exitCode}`);
    }

    return { exitCode, output };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    appendLog(`[Shell] ✗ Error: ${errMsg}`);
    throw err;
  }
}, [appendLog, setStatus, pipeProcessOutput]);

/**
 * Execute multiple shell commands sequentially
 */
const executeShellCommands = useCallback(async (commands: string[]) => {
  if (!containerRef.current || commands.length === 0) return;

  setExecuting(true);
  setStatus(`Executing ${commands.length} shell command(s)...`);
  appendLog(`[Shell] Starting execution of ${commands.length} command(s)`);

  try {
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      appendLog(`[Shell] (${i + 1}/${commands.length}) ${cmd}`);

      const result = await executeShellCommand(cmd);

      // Stop if command failed
      if (result.exitCode !== 0) {
        setError(`Command failed: ${cmd}`);
        toast.error(`Shell command failed: ${cmd}`, { duration: 10000 });
        break;
      }

      // Small delay between commands
      if (i < commands.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    appendLog(`[Shell] ✓ All commands executed successfully`);
    toast.success('All shell commands executed successfully!');
    clearShellCommands();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    setError(`Shell execution failed: ${errMsg}`);
    toast.error(`Shell execution failed: ${errMsg}`, { duration: 10000 });
  } finally {
    setExecuting(false);
    setStatus(previewUrl ? 'Ready' : 'Waiting for files...');
  }
}, [executeShellCommand, clearShellCommands, appendLog, setExecuting, setStatus, setError, previewUrl]);

// Auto-execute shell commands when they arrive
useEffect(() => {
  if (shellCommands.length > 0 && containerReady) {
    // Execute commands after current sync completes
    syncQueueRef.current = syncQueueRef.current.then(() =>
      executeShellCommands(shellCommands)
    );
  }
}, [shellCommands, containerReady, executeShellCommands]);
```

---

## Testing Checklist

### Phase 1: Artifact Parsing
- [ ] Backend receives artifact mode request
- [ ] Correct prompt is used (getHyperFramePrompt)
- [ ] AI generates artifacts with files
- [ ] Backend parses artifacts correctly
- [ ] Files are sent to frontend

### Phase 2: Shell Commands
- [ ] Backend extracts shell commands from artifacts
- [ ] Shell commands sent to frontend in complete event
- [ ] Frontend stores commands in preview store
- [ ] Commands visible in logs

### Phase 3: Execution
- [ ] Single shell command executes in WebContainer
- [ ] Output streams to terminal
- [ ] Multiple commands execute sequentially
- [ ] Errors are caught and displayed

### Phase 4: Integration
- [ ] Prompt: "Add three package" → package.json updated → npm install runs
- [ ] Prompt: "Create React app with three.js" → all files + deps + install
- [ ] Verify files write before commands execute
- [ ] Dev server restarts after install

---

## Quick Start Commands

```bash
# 1. Test artifact prompt locally
bun run dev:backend
curl -X POST http://localhost:3001/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Create a simple p5 sketch"}],"model":"claude-sonnet-4-5","editMode":"artifact"}'

# 2. Run full stack
bun run dev

# 3. Test in UI
# - Go to http://localhost:3030
# - Settings → Edit Mode → Artifact Mode
# - Chat: "Create a bouncing ball with p5.js"
# - Watch terminal for npm install execution
```

---

## Rollback Plan

If issues arise:
1. Change `editMode` default back to `"patch"` in settingsStore.ts
2. Users can manually select patch/full mode in settings
3. Artifact mode remains available but not default

---

## Benefits

✅ **Full npm package support** - Real packages, no CDN workarounds
✅ **Real command execution** - npm install, build scripts, file operations
✅ **Better AI suggestions** - Can modify package.json and run installs
✅ **Professional workflow** - Industry-standard artifact pattern
✅ **Backwards compatible** - Patch/full modes still work
✅ **Already has WebContainer** - Just wiring up the pieces
✅ **@hypertool/runtime integration** - HyperFrame API available out of the box

---

## Files Summary

**CREATE:**
- `frontend/src/stores/previewStore.ts`

**MODIFY:**
- `backend/src/types/ai.ts` (1 line change)
- `backend/src/routes/ai-stream.ts` (~50 lines added)
- `frontend/src/stores/settingsStore.ts` (3 lines changed)
- `frontend/src/stores/index.ts` (1 export added)
- `frontend/src/types/studio.ts` (1 interface added)
- `frontend/src/hooks/useAIChat.ts` (~10 lines added)
- `frontend/src/components/Preview/PreviewPanel.tsx` (~100 lines added)

**TOTAL: ~165 lines of new code + 5 lines changed**
