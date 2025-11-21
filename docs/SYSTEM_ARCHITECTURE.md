# HyperTool System Architecture

Complete system architecture including frontend, backend, runtime, and artifact workflow.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            HyperTool Studio                             │
│                         (Next.js 16 Frontend)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐               │
│  │ Editor Panel │  │  Chat Panel  │  │ Preview Panel │               │
│  │  - Settings  │  │  - AI Stream │  │  - WebContainer│              │
│  │  - Controls  │  │  - Messages  │  │  - Terminal   │               │
│  └──────────────┘  └──────────────┘  └───────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                               ▲ ▼
                        Files + Commands
                               ▲ ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Backend API Server                               │
│                           (Hono.js + Bun)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /api/ai/stream                                                    │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 1. Receive: { messages, model, editMode: "artifact" }            │ │
│  │ 2. Select Prompt: getHyperFramePrompt()                          │ │
│  │ 3. Stream AI Response                                             │ │
│  │ 4. Parse: <hypertlArtifact>...</hypertlArtifact>                │ │
│  │ 5. Extract: Files + Shell Commands                               │ │
│  │ 6. Send: { files, shellCommands, artifact }                      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                               ▲ ▼
                          OpenAI / Claude / Gemini
                               ▲ ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        WebContainer Runtime                              │
│                  (In-Browser Node.js Environment)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Receives Files: package.json, main.ts, index.html                  │
│  2. Writes to VFS: container.fs.writeFile(...)                         │
│  3. Executes Commands: container.spawn('sh', ['-c', 'npm install'])    │
│  4. Output Streams: Terminal + Logs                                    │
│  5. Dev Server: Vite/Next running on http://localhost:3000             │
└─────────────────────────────────────────────────────────────────────────┘
                               ▲ ▼
                          Loads Runtime Bundle
                               ▲ ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   @hypertool/runtime Package                            │
│              (Injected as __hypertool__/ files)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  window.hyperFrame = {                                                  │
│    createSandbox(options) {                                             │
│      // Provides: context.mount, context.params, context.exports       │
│      // Controls: Tweakpane integration                                 │
│      // Capture: PNG/WebM recording                                     │
│    },                                                                    │
│    mirrorCss() { /* Syncs Studio CSS to iframe */ },                   │
│  };                                                                      │
│                                                                          │
│  window.hypertoolControls = {                                           │
│    createControls(definitions) { /* Tweakpane UI */ },                  │
│  };                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                               ▲ ▼
                          User Sketch Runs
                               ▲ ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          User Project Files                              │
│                (Running inside WebContainer iframe)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  /main.ts:                                                              │
│    import p5 from 'p5';                                                 │
│                                                                          │
│    window.hyperFrame.createSandbox({                                    │
│      controls: {                                                         │
│        definitions: {                                                    │
│          color: { type: 'color', value: '#ff0000' }                     │
│        }                                                                 │
│      },                                                                  │
│      setup(context) {                                                    │
│        new p5((p) => {                                                   │
│          p.setup = () => {                                               │
│            p.createCanvas(...context.mount.clientWidth, ...);           │
│          };                                                              │
│          p.draw = () => {                                                │
│            p.background(context.params.color);                           │
│          };                                                              │
│        }, context.mount);                                                │
│      }                                                                   │
│    });                                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend (Next.js 16 + React 19)

**Location**: `/frontend`

**Key Components**:

- **EditorPage** (`src/app/editor/page.tsx`)
  - Main layout with chat, settings, preview
  - Handles auth with Clerk

- **ChatPanel** (`src/components/Chat/`)
  - Message display
  - Input with send button
  - Uses `useAIChat` hook

- **PreviewPanel** (`src/components/Preview/PreviewPanel.tsx`)
  - WebContainer integration
  - Terminal (xterm.js)
  - File sync + Shell execution
  - Dev server management

- **SettingsPanel** (`src/components/Settings/`)
  - Model selection
  - Edit mode (artifact/patch/full)
  - API keys
  - System prompt

**Stores** (Zustand):

```typescript
// src/stores/
filesStore.ts      → Current project files
chatStore.ts       → Messages + streaming state
settingsStore.ts   → Model, editMode, API keys
versionsStore.ts   → Code version history
previewStore.ts    → Shell commands + execution state (NEW!)
```

**Hooks**:

```typescript
// src/hooks/
useAIChat.ts         → AI streaming, file updates, shell command handling
useWebContainer.ts   → WebContainer boot + management (in PreviewPanel)
```

---

### 2. Backend (Hono.js + Bun)

**Location**: `/backend`

**Main Route**: `src/routes/ai-stream.ts`

**Flow**:

```typescript
POST /api/ai/stream
  ↓
1. Parse request: { messages, model, editMode, currentFiles }
  ↓
2. Select prompt based on editMode:
   - artifact → getHyperFramePrompt()
   - patch   → DEFAULT_SYSTEM_PROMPT_PATCH
   - full    → DEFAULT_SYSTEM_PROMPT_FULL
  ↓
3. Stream AI response (streamText)
  ↓
4. Detect format:
   - Contains <hypertlArtifact>? → Parse artifacts
   - Contains JSON? → Parse patch/full
  ↓
5. Extract from artifact:
   - Files: artifactToFileMap(artifact)
   - Shell commands: actions.filter(type === 'shell')
  ↓
6. Stream events to frontend:
   - type: 'start'
   - type: 'token' (AI output)
   - type: 'complete' {
       files: Record<string, string>,
       shellCommands: string[],
       explanation: string,
       artifact: { id, title }
     }
```

**Prompt System**: `src/prompts/prompt.ts`

```typescript
export function getHyperFramePrompt(): string
export function parseArtifacts(text): HypertlArtifact[]
export function artifactToFileMap(artifact): Record<string, string>

interface HypertlArtifact {
  id: string;
  title: string;
  actions: HypertlAction[];
}

interface HypertlAction {
  type: 'file' | 'shell' | 'start';
  filePath?: string;
  contentType?: string;
  content?: string;
}
```

---

### 3. Runtime Package (@hypertool/runtime)

**Location**: `/packages/runtime`

**Purpose**: Provides the HyperFrame API and controls system that runs in user sketches

**Structure**:

```
runtime/
├── src/
│   ├── index.ts              → Main entry, auto-init for browser
│   ├── frame/
│   │   ├── runtime.ts        → createSandbox, HyperFrame API
│   │   ├── cssBridge.ts      → CSS mirroring from Studio
│   │   └── types.ts          → HyperFrame types
│   └── controls/
│       ├── HypertoolControls.ts  → Tweakpane wrapper
│       ├── theme.ts          → Studio design tokens
│       └── types.ts          → Control definition types
├── dist/                     → Built bundles
│   ├── index.js              → Full runtime
│   ├── controls/index.js     → Controls only
│   └── frame/index.js        → Frame only
└── package.json
```

**APIs Exposed**:

```typescript
// Auto-initialized on window when runtime loads

window.hyperFrame = {
  version: 'universal',
  createSandbox(options: HyperFrameSandboxOptions),
  mirrorCss(),
  runtime,
};

window.hypertoolControls = {
  createControls(definitions),
  createControlPanel(definitions, options),
  HypertoolControls,
  injectThemeVariables(),
  studioTheme,
};
```

**HyperFrame API**:

```typescript
window.hyperFrame.createSandbox({
  // External CDN dependencies (optional)
  dependencies?: Array<{
    type: 'script' | 'style';
    url: string;
    async?: boolean;
  }>;

  // Control definitions (optional)
  controls?: {
    definitions: ControlDefinitions;
    options?: { title?: string; position?: 'right' | 'left' };
  };

  // Main setup callback
  setup(context: SandboxContext): void | (() => void);
});

interface SandboxContext {
  // DOM container for rendering
  mount: HTMLElement;

  // Reactive parameter values from controls
  params: Record<string, any>;

  // Control panel handle
  controls?: SandboxControlsHandle;

  // Capture API (PNG/WebM)
  exports: SandboxExportsApi;

  // Environment utilities
  environment: SandboxEnvironment;
}
```

**Injection Process**:

1. Backend transforms runtime dist/ → `backend/src/data/runtime-data.ts`
2. Files injected as `__hypertool__/frame/index.js` in WebContainer
3. User imports: `import { ... } from '__hypertool__/frame/index.js'`
4. Or uses global: `window.hyperFrame.createSandbox(...)`

---

### 4. WebContainer Integration

**Location**: `frontend/src/components/Preview/PreviewPanel.tsx`

**Lifecycle**:

```typescript
1. Boot WebContainer:
   const container = await WebContainer.boot();

2. Write files to VFS:
   for (const [path, content] of files) {
     await container.fs.writeFile(path, content);
   }

3. Execute shell commands:
   const process = await container.spawn('sh', ['-c', 'npm install']);
   process.output.pipeTo(terminalStream);
   await process.exit;

4. Start dev server:
   const devProcess = await container.spawn('npm', ['run', 'dev']);
   const url = await getDevServerUrl(devProcess);

5. Display in iframe:
   <iframe src={url} />
```

**New: Shell Command Execution**:

```typescript
// In PreviewPanel.tsx

const shellCommands = usePreviewStore(state => state.shellCommands);

const executeShellCommand = async (command: string) => {
  const process = await container.spawn('sh', ['-c', command]);

  // Pipe output to terminal
  process.output.pipeTo(new WritableStream({
    write(chunk) {
      terminal.write(chunk);
      appendLog(chunk);
    }
  }));

  const exitCode = await process.exit;
  return { exitCode, output };
};

const executeShellCommands = async (commands: string[]) => {
  for (const cmd of commands) {
    const result = await executeShellCommand(cmd);
    if (result.exitCode !== 0) {
      throw new Error(`Command failed: ${cmd}`);
    }
  }
};

// Auto-execute when commands arrive from AI
useEffect(() => {
  if (shellCommands.length > 0 && containerReady) {
    executeShellCommands(shellCommands);
  }
}, [shellCommands, containerReady]);
```

---

## Artifact Workflow (NEW!)

### Example: "Add three.js to project"

**1. User sends message**:
```typescript
Chat Input: "Add three.js package to the project"
```

**2. Frontend sends request**:
```typescript
POST /api/ai/stream
{
  messages: [{ role: "user", content: "Add three.js..." }],
  model: "claude-sonnet-4-5",
  editMode: "artifact",
  currentFiles: { "/main.ts": "...", ... }
}
```

**3. Backend selects prompt**:
```typescript
const prompt = getHyperFramePrompt(); // Teaches AI about hypertlArtifact format
```

**4. AI generates artifact**:
```xml
<hypertlArtifact id="add-threejs" title="Add Three.js Package">
  <hypertlAction type="file" filePath="/package.json" contentType="application/json">
    {
      "name": "threejs-project",
      "type": "module",
      "dependencies": {
        "three": "^0.160.0"
      },
      "devDependencies": {
        "@types/three": "^0.160.0"
      }
    }
  </hypertlAction>

  <hypertlAction type="shell">
    npm install
  </hypertlAction>
</hypertlArtifact>
```

**5. Backend parses artifact**:
```typescript
const artifacts = parseArtifacts(fullText);
const artifact = artifacts[0];

const files = artifactToFileMap(artifact);
// files = { "/package.json": "{ ... }" }

const shellCommands = artifact.actions
  .filter(a => a.type === 'shell')
  .map(a => a.content);
// shellCommands = ["npm install"]
```

**6. Backend streams to frontend**:
```typescript
stream.write(`data: ${JSON.stringify({
  type: 'complete',
  mode: 'artifact',
  files: { "/package.json": "..." },
  shellCommands: ["npm install"],
  explanation: "Added Three.js package",
  artifact: { id: "add-threejs", title: "Add Three.js Package" }
})}\n\n`);
```

**7. Frontend receives and stores**:
```typescript
// In useAIChat.ts
if (event.type === 'complete') {
  if (event.files) {
    setFiles(event.files);  // Update file store
  }

  if (event.shellCommands) {
    usePreviewStore.getState().setShellCommands(event.shellCommands);
  }
}
```

**8. Preview Panel executes**:
```typescript
// In PreviewPanel.tsx (auto-triggered by useEffect)

// Write package.json to WebContainer
await container.fs.writeFile('package.json', files['/package.json']);

// Execute shell command
const process = await container.spawn('sh', ['-c', 'npm install']);

// Stream output
process.output.pipeTo(terminalStream);
// Terminal shows: "npm install three@0.160.0 ✓"

// Wait for completion
await process.exit;
```

**9. Result**:
- ✅ package.json updated
- ✅ three.js installed in WebContainer
- ✅ User can now `import * as THREE from 'three'`
- ✅ Terminal shows installation progress
- ✅ No page reload needed

---

## Data Flow Diagram

```
User Input
   ↓
Chat Store (setInput)
   ↓
useAIChat Hook (sendMessage)
   ↓
Fetch /api/ai/stream {
  messages: [...],
  model: "claude-sonnet-4-5",
  editMode: "artifact",
  currentFiles: {...}
}
   ↓
Backend ai-stream.ts
   ↓
Select Prompt (getHyperFramePrompt)
   ↓
Stream AI (streamText)
   ↓
Parse Artifacts (parseArtifacts)
   ↓
Extract Files + Commands
   ↓
Stream { type: 'complete', files, shellCommands }
   ↓
Frontend receives (useAIChat)
   ↓
Update Files Store
   ↓
Update Preview Store (shellCommands)
   ↓
PreviewPanel (useEffect detects commands)
   ↓
Write files to WebContainer FS
   ↓
Execute shell commands (spawn)
   ↓
Stream output to Terminal
   ↓
Dev server restarts
   ↓
Iframe shows updated preview
```

---

## Key Files Reference

### Backend
- `backend/src/routes/ai-stream.ts` - Main AI streaming endpoint
- `backend/src/prompts/prompt.ts` - HyperFrame prompt + artifact parsing
- `backend/src/lib/aiProviders.ts` - OpenAI/Claude/Gemini setup
- `backend/src/lib/patches.ts` - Legacy patch mode logic

### Frontend
- `frontend/src/hooks/useAIChat.ts` - AI streaming hook
- `frontend/src/components/Preview/PreviewPanel.tsx` - WebContainer + execution
- `frontend/src/stores/previewStore.ts` - Shell command state (NEW!)
- `frontend/src/stores/filesStore.ts` - Current files
- `frontend/src/stores/settingsStore.ts` - Model + editMode

### Runtime
- `packages/runtime/src/index.ts` - Main entry, window setup
- `packages/runtime/src/frame/runtime.ts` - createSandbox implementation
- `packages/runtime/src/controls/HypertoolControls.ts` - Tweakpane wrapper
- `packages/runtime/src/frame/cssBridge.ts` - CSS mirroring

### Types
- `backend/src/types/ai.ts` - Request/response schemas
- `frontend/src/types/studio.ts` - Frontend types + StreamEvent
- `packages/runtime/src/frame/types.ts` - HyperFrame API types
- `packages/runtime/src/controls/types.ts` - Control definition types

---

## Technology Stack

**Frontend**:
- Next.js 16 (Turbo, App Router)
- React 19
- Zustand (state)
- WebContainer API
- xterm.js (terminal)
- Tailwind CSS
- Clerk (auth)

**Backend**:
- Hono.js (fast routing)
- Bun runtime
- Vercel AI SDK (streaming)
- OpenAI/Anthropic/Google SDKs

**Runtime**:
- Tweakpane (controls UI)
- Pure TypeScript
- ES modules

**Database**:
- Convex (real-time, serverless)

**Deployment**:
- Vercel (frontend + backend)
- Convex Cloud (database)

---

## Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Convex
CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Clerk Auth
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_URL=https://...

# Backend
PORT=3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

---

## Build & Deploy

```bash
# Development
bun run dev                 # All services (frontend + backend + convex)
bun run dev:frontend        # Frontend only (port 3030)
bun run dev:backend         # Backend only (port 3001)
bun run dev:convex          # Convex dev server

# Build
bun run build               # Build all packages
bun run build:frontend      # Build frontend (requires runtime built first)
bun run build:backend       # Build backend (transforms runtime data)

# Production
bun run start               # Start production servers
```

---

## Future Enhancements

1. **Multi-artifact support** - Handle multiple artifacts in one response
2. **Dependency caching** - Cache npm packages in WebContainer
3. **Hot reload optimization** - Faster file sync
4. **Command queuing** - Better handling of sequential commands
5. **Dry-run mode** - Preview commands before execution
6. **Artifact history** - Undo/redo for artifacts
7. **Template generation** - Save artifacts as reusable templates
8. **Parallel execution** - Run safe commands in parallel

---

## Performance Considerations

- **WebContainer boot time**: ~2-3s (happens once per session)
- **File sync**: Instant for small files, ~100ms for large projects
- **npm install**: 5-30s depending on package count
- **Dev server startup**: 1-3s (Vite is faster than Next.js)
- **AI streaming**: Real-time token streaming with minimal latency
- **Terminal output**: Buffered and rendered efficiently

---

## Security

- **Sandboxed execution**: WebContainer provides full isolation
- **API key handling**: Never stored in WebContainer, only in memory
- **File restrictions**: System files (`__hypertool__/`) protected
- **Command validation**: Shell commands sanitized before execution
- **Auth**: Clerk handles all authentication + session management

---

This architecture enables a full-featured creative coding IDE in the browser with AI assistance, real npm packages, and a professional development experience.
