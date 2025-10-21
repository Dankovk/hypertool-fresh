# Hypertool Studio – Updated Development Approach

This note captures the architectural shift we made after commit `21a7514` and how every future change should be structured.

## 1. Hyper Runtime First Mentality

- **Hyper Runtime owns bootstrapping.** Presets no longer import `p5`, `react`, or Tweakpane directly. Entry points should call `window.hyperRuntime.frame.startP5Sketch({ ... })` (or the legacy alias `window.hyperFrame.p5.start({ ... })`). Everything else (script injection, readiness polling, control wiring) lives inside Hyper Runtime.
- **`sketch.ts` contains the feature logic only.** Controls are defined through `controlDefinitions`, lifecycle handlers (`setup`, `draw`, etc.), and optional helpers like `handleControlChange`.
- **Never touch `__hypertool__/…` files.** These bundles are regenerated automatically. When inspecting file maps, expect Hyper Runtime bundles to appear there.

## 2. Controls Strategy

- Use `controlDefinitions` exclusively for describing parameters. Hyper Runtime translates that into UI (via `hypertoolControls`) and into runtime context.
- Control change hooks belong in `handleControlChange`. Use it to start/stop loops, change behaviour, or sync state.
- Any new preset should export the same surface (`controlDefinitions`, `setup`, `draw`, etc.) so AI interactions stay consistent.

## 3. When Adding or Editing Presets

1. Create/update `sketch.ts` with pure feature code.
2. Ensure `main.tsx` simply invokes `hyperRuntime.frame.startP5Sketch({ ... })` (or the legacy `hyperFrame.p5.start({ ... })`). If the preset needs special readiness steps, wrap the call but don’t reintroduce direct p5/Tweakpane setup.
3. Test inside Sandpack – you should see Hyper Runtime load p5 automatically and controls appear without additional imports.

## 4. AI Workflow Expectations

- The AI service now filters out `__hypertool__/…` assets before building prompts but reattaches them when returning responses. When expecting AI patches, specify file paths relative to the project root (e.g. `/sketch.ts`).
- System prompts assume the Hyper Runtime pattern. AI responses should not reintroduce manual p5/Tweakpane wiring; if they do, adjust the prompt rather than accepting the change.
- When applying patches manually, run `npm run typecheck` to surface lingering TypeScript issues (some legacy warnings still exist).

## 5. Future Enhancements

- We can extract reusable control helpers (e.g., generating star/noise presets) into shared modules inside Hyper Runtime.
- Investigate reducing iframe noise by tightening message filtering. Current listeners log every iframe message for diagnostics.

## TL;DR

Think of presets as **feature modules**. Every wrapper (loading scripts, controls, messaging) belongs to Hyper Runtime. Keep feature code in `sketch.ts`, call `hyperRuntime.frame.startP5Sketch` (or `hyperFrame.p5.start`), and let the platform handle everything else.


1. **Hyper Runtime** (`hyper-runtime/src/index.ts`)
    - Owns loading p5 from CDN, waiting for controls, wiring lifecycle events, and calling your handlers.
    - Exposed globally via `window.hyperRuntime` plus compatibility aliases on `window.hyperFrame`/`window.hypertoolControls`.
    - Injected automatically when boilerplate files are loaded (see `ensureSystemFiles`).

2. **Controls Module** (`hyper-runtime/src/controls`)
    - Translates `controlDefinitions` into a styled Tweakpane experience consistent with Studio.
    - Handles change events and exposes helpers consumed by the runtime.

3. **Preset Contract**
    - Each preset exports its creative logic from `sketch.ts`: `controlDefinitions`, `setup`, `draw`, optional `handleControlChange`, etc.
    - `main.tsx` is tiny: wait for `hyperFrame.p5.start` and pass the sketch in. No other framework code belongs here.
    - Legacy presets have been parked in `boilerplate-presets/__non-migrated__` until they are updated to the new contract.

4. **AI Workflow Awareness**
    - Prompts (see `src/config/prompts.ts`) now describe this architecture so AI replies stay inside the platform boundaries.
    - `/api/ai` filters out `__hypertool__/…` files before building prompts, but reattaches them in responses to keep Sandpack stable.
    - Patch application normalises file paths, ignores internal bundles, and logs missing-path diagnostics.

## 3. How to Work on Presets Now

1. **Start in `sketch.ts`.** Define parameters and handlers. Keep it pure TypeScript/JavaScript—no DOM queries, no script tags.
2. **Use `controlDefinitions`.** It’s the single source of truth for tweakable parameters. Hyper Runtime will update both UI and runtime state automatically.
3. **Bootstrap with Hyper Runtime.** In `main.tsx`:

   ```ts
   waitForStarter()
     .then((start) => start({
       controlDefinitions,
       handlers: { setup, draw, keyPressed, mousePressed },
       controls: { title: 'Circle Controls', onChange: handleControlChange },
       mount: { containerClassName: 'circle' },
     }))
     .catch((error) => console.error('[preset] Failed to initialise', error));
   ```

4. **No direct edits in `__hypertool__/`.** Those bundles are regenerated; if you need new runtime behaviour, extend Hyper Runtime.

5. **Testing Workflow.** Run `npm run dev` (once the port conflict is cleared) and load the preset. You should see Hyper Runtime scripts in the network tab and `hyperRuntime.frame.startP5Sketch` (or `hyperFrame.p5.start`) on `window` before sketches run.

## 4. AI & Patching Expectations

- AI receives only user files (`/sketch.ts`, `/main.tsx`, etc.) but the response is merged with the preserved bundles via `ensureSystemFiles`.
- Paths in patches must include the leading slash (e.g. `/sketch.ts`). The patch layer normalises this, but following the convention avoids warnings.
- System prompts tell AI not to import p5/Tweakpane manually; if a response reintroduces that, prefer regenerating the answer instead of hand-merging.

## 5. Migration Checklist for Remaining Presets

1. Move legacy preset under `__non-migrated__` out of the way.
2. Create `sketch.ts` with controls + handlers.
3. Replace any custom bootstrap with the Hyper Runtime `start` call.
4. Verify AI interactions still work (patch + full modes).
5. Remove legacy glue (React wrappers, iframe message handling) once all presets are migrated.

## 6. Key Files to Know

- `hyper-runtime/src/frame/index.ts`: Hyper Runtime implementation; add new capabilities here.
- `hyper-runtime/src/controls/HypertoolControls.ts`: Styled Tweakpane wrapper.
- `src/lib/boilerplate.ts`: Injects runtime bundles and rewrites `index.html`.
- `src/app/api/ai/route.ts`: Shapes AI prompts and merges responses.
- `boilerplate-presets/circle/sketch.ts`: Example reference implementation of the new pattern.

With these pieces, the mental model is simple: **feature logic lives in `sketch.ts`; everything else is a Hyper Runtime service.**
