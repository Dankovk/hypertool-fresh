# Implementation Plan: Bolt.diy-Style Artifacts with WebContainer

## Current State Analysis

### ✅ Already Working
- **WebContainer**: Already installed (`@webcontainer/api@^1.4.0`) and integrated in `PreviewPanel.tsx`
- **Terminal**: xterm.js integrated and working
- **File Sync**: WebContainer can write files and sync them
- **AI Streaming**: Sophisticated streaming system in place with patch/full modes
- **Process Management**: Can run dev servers and pipe output to terminal

### 🔧 What Needs to Change

## 1. Backend Changes

### File: `backend/src/routes/ai-stream.ts`

**Changes needed:**

```typescript
// Add imports
import { getHyperFramePrompt, parseArtifacts, artifactToFileMap } from '../prompts/prompt.js';

// Add artifact mode to schema validation
const AiRequestSchema = z.object({
  // ... existing fields
  editMode: z.enum(['patch', 'full', 'artifact']).optional(),
});

// In the main handler, add mode detection:
const mode = editMode || 'patch'; // Default to patch for backwards compat

// Select prompt based on mode
const systemPrompt = mode === 'artifact'
  ? getHyperFramePrompt()
  : mode === 'patch'
    ? (useGemini ? GEMINI_SYSTEM_PROMPT_PATCH : DEFAULT_SYSTEM_PROMPT_PATCH)
    : (useGemini ? GEMINI_SYSTEM_PROMPT_FULL : DEFAULT_SYSTEM_PROMPT_FULL);

// After streaming completes, detect if response contains artifacts
if (mode === 'artifact' || fullText.includes('<boltArtifact')) {
  // Parse artifacts
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
    const mergedFiles = mergeWithSystemFiles(systemFiles, newFiles);

    // Send complete event with shell commands
    const completeEvent = {
      type: 'complete',
      mode: 'artifact',
      files: normalizeFileMap(mergedFiles, { ensureLeadingSlash: true }),
      shellCommands, // NEW!
      explanation: artifact.title, // Or extract from markdown
      artifact: {
        id: artifact.id,
        title: artifact.title,
      },
    };

    await stream.write(`data: ${JSON.stringify(completeEvent)}\n\n`);
    return;
  }
}

// Fall back to existing patch/full logic
```

**Location**: Line ~96-420 in `ai-stream.ts`

---

## 2. Frontend: Settings Store

### File: `frontend/src/stores/settingsStore.ts`

**Changes needed:**

```typescript
interface SettingsState {
  // ... existing fields
  editMode: 'patch' | 'full' | 'artifact'; // Add 'artifact'
}

const useSettingsStore = create<SettingsState>((set) => ({
  // ... existing state
  editMode: 'artifact', // Default to new artifact mode

  setEditMode: (mode: 'patch' | 'full' | 'artifact') => set({ editMode: mode }),
}));
```

---

## 3. Frontend: AI Chat Hook

### File: `frontend/src/hooks/useAIChat.ts`

**Changes needed:**

```typescript
// At line ~143, in the "complete" event handler:

} else if (event.type === "complete") {
  try {
    // ... existing explanation handling

    if (event.files) {
      const parsed = FileMapSchema.safeParse(event.files);

      if (parsed.success) {
        const normalized = toClientFiles(parsed.data);
        addVersion(normalized, currentInput, model);
        setFiles(normalized);

        // NEW: Handle shell commands
        if (event.shellCommands && event.shellCommands.length > 0) {
          // Store commands to be executed by PreviewPanel
          usePreviewStore.getState().setShellCommands(event.shellCommands);
          toast.info(`${event.shellCommands.length} shell commands ready to execute`);
        }

        toast.success(`Files applied! (${Object.keys(event.files).length} files)`);
      }
      // ... rest of handler
    }
  }
}
```

---

## 4. Frontend: Preview Store (NEW)

### File: `frontend/src/stores/previewStore.ts` (CREATE NEW)

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
}));
```

---

## 5. Frontend: Preview Panel

### File: `frontend/src/components/Preview/PreviewPanel.tsx`

**Changes needed:**

```typescript
// Add import
import { usePreviewStore } from '@/stores/previewStore';

// Inside PreviewPanel component:
const shellCommands = usePreviewStore((state) => state.shellCommands);
const clearShellCommands = usePreviewStore((state) => state.clearShellCommands);
const setExecuting = usePreviewStore((state) => state.setExecuting);
const addExecutionLog = usePreviewStore((state) => state.addExecutionLog);

// Add shell command executor function
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

    // Pipe output to terminal and collect it
    if (process.output) {
      const reader = process.output.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        output += text;

        // Write to terminal
        if (terminalRef.current) {
          terminalRef.current.write(text);
        }

        addExecutionLog(text);
      }
    }

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
}, [appendLog, setStatus, addExecutionLog]);

// Add executor for multiple commands
const executeShellCommands = useCallback(async (commands: string[]) => {
  if (!containerRef.current || commands.length === 0) return;

  setExecuting(true);
  setStatus('Executing shell commands...');

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
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    toast.success('All shell commands executed successfully!');
    clearShellCommands();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    setError(`Shell execution failed: ${errMsg}`);
    toast.error(`Shell execution failed: ${errMsg}`, { duration: 10000 });
  } finally {
    setExecuting(false);
    setStatus('Ready');
  }
}, [executeShellCommand, clearShellCommands, appendLog, setExecuting, setStatus, setError]);

// Add effect to auto-execute commands when they arrive
useEffect(() => {
  if (shellCommands.length > 0 && containerReady && !devServerRef.current) {
    // Execute commands after files are synced
    syncQueueRef.current = syncQueueRef.current.then(() =>
      executeShellCommands(shellCommands)
    );
  }
}, [shellCommands, containerReady, executeShellCommands]);
```

**Location**: After line ~400, add these new methods and effect

---

## 6. Frontend: Export Preview Store

### File: `frontend/src/stores/index.ts`

**Add export:**

```typescript
export { usePreviewStore } from './previewStore';
```

---

## 7. Type Definitions

### File: `frontend/src/types/studio.ts`

**Add shell command types:**

```typescript
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
  // ... other fields
}
```

---

## 8. Settings UI

### File: `frontend/src/components/Settings/SettingsPanel.tsx` (or wherever edit mode is selected)

**Add artifact option:**

```tsx
<select value={editMode} onChange={(e) => setEditMode(e.target.value)}>
  <option value="artifact">Artifact Mode (Recommended)</option>
  <option value="patch">Patch Mode (Token-efficient)</option>
  <option value="full">Full File Mode</option>
</select>

<p className="text-sm text-gray-500">
  {editMode === 'artifact' && 'Bolt.diy-style: Files + Shell commands + npm packages'}
  {editMode === 'patch' && 'Search/replace edits only (90%+ token savings)'}
  {editMode === 'full' && 'Complete file regeneration'}
</p>
```

---

## Testing Plan

### Phase 1: Basic Artifact Parsing
1. Test prompt generates artifacts correctly
2. Backend parses artifacts
3. Files extracted and sent to frontend
4. No shell commands yet

### Phase 2: Shell Command Extraction
1. Backend extracts shell commands
2. Frontend receives commands
3. Commands stored in preview store
4. Can view commands in UI

### Phase 3: WebContainer Execution
1. Execute single command manually
2. Stream output to terminal
3. Handle errors
4. Execute multiple commands sequentially

### Phase 4: Integration
1. AI suggests adding package → updates package.json → runs `npm install`
2. Verify files are written before commands execute
3. Test with different prompts:
   - "Add three.js package"
   - "Create a React component with dependencies"
   - "Install p5.js and create a sketch"

### Phase 5: Error Handling
1. Command fails → show error
2. npm install fails → show package error
3. WebContainer not ready → queue commands
4. Abort mid-execution

---

## Migration Strategy

### Stage 1: Add Artifact Support (Non-breaking)
- Add artifact mode as optional
- Keep patch/full as default
- Backend detects artifacts automatically
- Frontend handles both old and new formats

### Stage 2: Shell Command Execution
- Add preview store
- Add command execution to PreviewPanel
- Test with simple commands

### Stage 3: Make Artifact Default
- Change default editMode to 'artifact'
- Update UI to highlight artifact mode
- Add docs/tooltips

### Stage 4: Optimize
- Better error messages
- Command queuing
- Parallel execution where safe
- Dry-run mode

---

## Files to Create

1. **`frontend/src/stores/previewStore.ts`** - NEW store for shell commands
2. **`docs/IMPLEMENTATION_PLAN.md`** - This file

## Files to Modify

1. **`backend/src/routes/ai-stream.ts`** - Add artifact mode
2. **`backend/src/types/ai.ts`** - Add artifact to editMode enum
3. **`frontend/src/hooks/useAIChat.ts`** - Handle shell commands
4. **`frontend/src/components/Preview/PreviewPanel.tsx`** - Execute commands
5. **`frontend/src/stores/settingsStore.ts`** - Add artifact mode
6. **`frontend/src/stores/index.ts`** - Export preview store
7. **`frontend/src/types/studio.ts`** - Add shell command types
8. **Settings UI component** - Add artifact option

## Estimated Timeline

- **Backend changes**: 2-3 hours
- **Frontend store + types**: 1 hour
- **Preview panel execution**: 3-4 hours
- **UI updates**: 1 hour
- **Testing + debugging**: 4-6 hours

**Total**: ~12-16 hours of development time

---

## Success Criteria

- ✅ AI can generate artifacts with files + shell commands
- ✅ Backend parses artifacts correctly
- ✅ Files are written to WebContainer
- ✅ Shell commands execute in WebContainer
- ✅ Output streams to terminal in real-time
- ✅ Errors are handled gracefully
- ✅ Can install npm packages
- ✅ Can run build commands
- ✅ Compatible with existing patch/full modes
- ✅ No breaking changes to current functionality
