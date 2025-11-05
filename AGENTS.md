# Repository Guidelines

## Project Structure & Module Organization
- The monorepo runs on Bun workspaces orchestrated by Turbo. `frontend/` houses the Next.js 16 app; entry routes live under `src/app`, reusable UI in `src/components`, hooks in `src/hooks`, stores in `src/stores`, and static assets in `public/`.
- `backend/` contains the Bun-served Hono API. Keep handlers in `src/routes/**`, shared helpers in `src/lib`, and streamed runtime transforms sourced from `packages/runtime` and `packages/shared-config`.
- Convex serverless logic sits in `convex/` (`schema.ts`, `sessions.ts`, and generated client code). Operational scripts live in `scripts/`, while long-form architecture notes stay in `docs/`.

## Build, Test, and Development Commands
- `bun install` — install workspace dependencies; run once in the repo root.
- `bun run dev` — runs Turbo's pipeline, starting the Next.js frontend, Hono backend, and Convex dev server together.
- `bun run dev:frontend`, `bun run dev:backend`, and `bun run dev:convex` — focus on a single service when debugging.
- `bun run build` — builds all workspaces; use `bun run build:frontend` or `bun run build:backend` for isolated outputs.
- `bun run typecheck` and `bun --cwd=frontend run lint` — required pre-flight checks before PRs.

## Coding Style & Naming Conventions
- TypeScript everywhere; prefer 2-space indentation and trailing commas. Backend modules lean on single quotes, while frontend files follow Next.js defaults.
- Use `PascalCase` for React components, `camelCase` for functions and variables, and `kebab-case` for directories and route segments.
- Tailwind tokens drive styling in `frontend`; reuse shared constants from `packages/shared-config`. Run `bun --cwd=backend run typecheck` after editing runtime scripts.

## Testing Guidelines
- No automated test runner ships yet; treat `bun run typecheck` plus manual Convex flows as the current safety net.
- When adding coverage, prefer Bun’s native `bun test` (Vitest-compatible) and collocate specs as `*.test.ts` next to the module. Document any new test command in `package.json` and wire it into Turbo tasks.
- For UI work, add reproducible steps or recordings in the PR until an e2e suite lands.

## Commit & Pull Request Guidelines
- Recent commits read as concise imperative sentences (e.g., “Update redirect URLs in editor…”). Mirror that tone, keep subjects under ~72 characters, and explain context in the body when needed.
- PRs should link issues, describe user impact, list commands run, and include screenshots or clips for UI changes. Call out required env vars (see `turbo.json`) and note any Convex schema migrations or runtime rebuild steps.
