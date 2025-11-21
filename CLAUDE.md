# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HyperTool (Fresh Breeze) is an AI-powered creative coding environment that supports multiple visual frameworks (p5.js, Three.js, React, WebGL, etc.) through a universal iframe-based sandbox system. The project enables users to generate and edit interactive visualizations using AI with support for multiple LLM providers (OpenAI, Anthropic, Google Gemini).

## Tech Stack

- **Frontend**: Next.js 16 (Turbo), React 19, TypeScript, Tailwind CSS
- **Backend**: Hono.js (Bun runtime), TypeScript
- **Database**: Convex (real-time serverless database)
- **Auth**: Clerk (authentication via WorkOS)
- **AI**: Vercel AI SDK with multi-provider support (OpenAI, Anthropic, Google)
- **State Management**: Zustand
- **Monorepo**: Bun workspaces with Turbo

## Repository Structure

```
fresh-breeze/
├── frontend/           # Next.js app (port 3030)
├── backend/            # Hono.js API server (port 3001)
├── convex/             # Convex serverless functions and schema
├── packages/
│   ├── runtime/        # Universal HyperFrame sandbox system
│   ├── shared-config/  # Shared configuration (AI prompts, models, paths)
│   └── boilerplate-presets/ # Template presets for creative coding
└── scripts/            # Build and migration scripts
```

## Development Commands

### Running the Project

```bash
# Start all services (frontend, backend, convex)
bun run dev

# Individual services
bun run dev:frontend     # Frontend only (port 3030)
bun run dev:backend      # Backend only (port 3001)
bun run dev:convex       # Convex only (cleans up .js files first)
```

### Building

```bash
# Build all packages
bun run build

# Individual builds
bun run build:frontend   # Builds runtime first, then frontend
bun run build:backend    # Builds runtime and transforms data
bun run build:presets    # Build boilerplate presets
```

### Type Checking

```bash
bun run typecheck                 # Check all workspaces
bun run typecheck:frontend        # Frontend only
bun run typecheck:backend         # Backend only
```

### Convex Database

```bash
# Setup and run Convex dev server
bun run dev:convex

# Migrate boilerplates to Convex
bun run migrate:boilerplates
```

**Important**: Before running Convex, the pre-convex script automatically cleans up .js files to avoid "Two output files share the same path" errors.

## Architecture

### HyperFrame Universal Sandbox

The project uses a universal iframe-based sandbox system (HyperFrame) that can run any visual framework. Key concepts:

- **No framework-specific wrappers**: Instead of separate p5/Three adapters, there's one universal runtime
- **Iframe-based isolation**: Each visualization runs in an isolated iframe with style mirroring from Studio
- **Controls system**: Declarative control definitions (sliders, colors, etc.) via `controlDefinitions`
- **Export API**: Built-in PNG/WebM recording via `context.exports`
- **Universal entry point**: `window.hyperFrame.createSandbox({ ... })` in user code

Key API in user code:
```typescript
window.hyperFrame.createSandbox({
  dependencies: [...],  // External CDN scripts/styles
  controls: { definitions, options },
  setup(context) {
    // context.mount - DOM node for rendering
    // context.params - current control values
    // context.controls - control panel handle
    // context.exports - capture API
    // context.environment - window, document, resize handlers
  }
})
```

### AI Code Generation

**Three Interaction Modes**:

1. **Artifact Mode** (NEW - HyperTool artifact system, recommended):
   - Uses XML-based artifact/action structure for comprehensive project operations
   - Supports multiple file operations + shell commands in one response
   - Enables real npm package management via WebContainer
   - Structure:
     ```xml
     <hypertlArtifact id="feature-name" title="Feature Title">
       <hypertlAction type="file" filePath="/main.ts" contentType="text/typescript">
         // File content
       </hypertlAction>
       <hypertlAction type="shell">npm install package</hypertlAction>
     </hypertlArtifact>
     ```
   - **Action types**:
     - `file` - Create/update project files
     - `shell` - Execute commands in WebContainer (npm, build, etc.)
     - `start` - Refresh preview (auto-triggered)
   - **Prompt**: `getHyperFramePrompt()` in `backend/src/prompts/prompt.ts`
   - **Parsing**: `parseArtifacts(text)` → `HypertlArtifact[]`
   - **File extraction**: `artifactToFileMap(artifact)` → `Record<string, string>`
   - **See**: `/docs/SYSTEM_ARCHITECTURE.md` for complete flow
   - **See**: `/ARTIFACT_SYSTEM_CHANGES.md` for implementation guide

2. **Patch Mode** (default, 90%+ token savings):
   - Uses search/replace blocks for precise edits
   - Context-aware fuzzy matching handles whitespace
   - Maintains edit history with undo/redo
   - Schema: `{ edits: [{ type: "search-replace", filePath, search, replace }], explanation }`

3. **Full File Mode**:
   - Complete file regeneration for major rewrites
   - Schema: `{ files: { "/path": "content" }, explanation }`

**Model-specific behavior**:
- **Gemini models**: Use `streamObject()` with Zod validation for structured output
- **Claude/OpenAI**: Use `streamText()` with JSON extraction from response

**System files**: Files under `__hypertool__/` are system-managed (runtime bundles) and filtered from AI edits.

### Convex Integration

Convex provides real-time database with:
- **Boilerplates**: Preset templates stored with metadata and file contents
- **Code Versions**: Version history per session with timestamp-based retrieval
- **Sessions**: Per-browser session state (selected preset, current files)

**Function syntax**: Always use new Convex function syntax with validators:
```typescript
export const myQuery = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({ ... })),
  handler: async (ctx, args) => { ... }
});
```

See `.cursor/rules/convex_rules.mdc` for detailed Convex guidelines.

### Frontend Architecture

- **App Router**: Next.js 16 with React 19
- **Routes**:
  - `/` - Redirect to `/editor` if authenticated, else `/sign-in`
  - `/editor` - Main editor (requires auth + plan check)
  - `/billing` - Billing portal
  - `/sign-in`, `/sign-up` - Clerk auth redirects
- **State Management**: Zustand stores in `frontend/src/stores/`:
  - `boilerplateStore` - Preset templates
  - `filesStore` - Current file state
  - `chatStore` - AI conversation
  - `versionsStore` - Version history
  - `settingsStore` - User preferences (model, API keys)
  - `uiStore` - UI state (panels, modals)

### Backend Architecture

- **Hono.js** server with routes in `backend/src/routes/`:
  - `/api/ai/stream` - Streaming AI code generation (SSE)
  - `/api/ai` - Non-streaming AI endpoint
  - `/api/boilerplate` - Boilerplate CRUD
  - `/api/history` - Edit history (undo/redo)
  - `/api/download` - Project ZIP export
  - `/api/runtime-watch` - Runtime file watching
- **Transforms**: Build scripts transform boilerplate and runtime data at build time
  - `scripts/transform-boilerplates.ts` - Bundles presets
  - `scripts/transform-runtime.ts` - Bundles runtime library

### Runtime Package

Located in `packages/runtime/`, exports:
- `@hypertool/runtime` - Main runtime
- `@hypertool/runtime/controls` - Control definitions
- `@hypertool/runtime/frame` - Frame utilities

Built with Bun's bundler, generates:
- `dist/index.js` - Main bundle
- `dist/controls/index.js` - Controls bundle
- `dist/frame/index.js` - Frame bundle
- Type definitions for all exports

## Environment Variables

Required variables (see `turbo.json` for full list):

```bash
# Convex
CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_URL=https://...

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Port (backend)
PORT=3001
```

## Key Files

### Artifact System (NEW)
- `backend/src/prompts/prompt.ts` - HyperTool artifact prompt + parsing (`getHyperFramePrompt`, `parseArtifacts`)
- `frontend/src/stores/previewStore.ts` - Shell command execution state
- `docs/SYSTEM_ARCHITECTURE.md` - Complete system architecture with runtime
- `ARTIFACT_SYSTEM_CHANGES.md` - Implementation guide

### Runtime Package
- `packages/runtime/src/index.ts` - HyperFrame API + Controls (auto-injected to WebContainer)
- `packages/runtime/src/frame/runtime.ts` - `window.hyperFrame.createSandbox()`
- `packages/runtime/src/controls/HypertoolControls.ts` - Tweakpane wrapper

### Core System
- `backend/src/routes/ai-stream.ts` - Main AI streaming endpoint (handles artifacts)
- `backend/src/lib/patches.ts` - Patch mode logic (legacy)
- `frontend/src/components/Preview/PreviewPanel.tsx` - WebContainer + shell execution
- `frontend/src/hooks/useAIChat.ts` - AI streaming hook
- `convex/schema.ts` - Convex database schema
- `frontend/src/middleware.ts` - Clerk auth middleware

### Configuration
- `packages/shared-config/prompts.js` - Legacy patch/full prompts
- `packages/shared-config/models.js` - Available AI models

## Important Notes

1. **Always use Bun**: Package manager is Bun (not npm/yarn/pnpm)
2. **System files are protected**: Never edit `__hypertool__/` files - they're auto-generated
3. **Convex cleanup**: `dev:convex` automatically cleans .js files before starting
4. **Frontend port**: 3030 (not default 3000)
5. **Backend port**: 3001
6. **Runtime must build first**: Frontend and backend depend on built runtime artifacts
7. **Patch validation**: Search strings must be non-empty and at least 10 characters
8. **Provider detection**: Model name determines provider (contains 'gemini', 'claude', 'gpt', etc.)
9. **Artifact naming**: Use `hypertlArtifact` and `hypertlAction` (not "bolt")
10. **Runtime injection**: `@hypertool/runtime` auto-injected as `__hypertool__/` in WebContainer
11. **Shell execution**: Commands run in WebContainer, output streams to terminal in real-time

## Testing Locally

1. Set up environment variables in `.env.local` (root and frontend)
2. Initialize Convex: `bun run dev:convex` (first time)
3. Migrate boilerplates: `bun run migrate:boilerplates`
4. Run all services: `bun run dev`
5. Visit http://localhost:3030

## Debugging Tips

- **Convex type errors**: Regenerate with `bunx convex dev`
- **"Two output files" error**: Run `bun run scripts/pre-convex.sh`
- **AI streaming errors**: Check provider API keys and model availability
- **Patch failures**: Ensure search strings match exactly (whitespace-sensitive with fuzzy tolerance)
- **Build failures**: Ensure runtime builds before frontend/backend
