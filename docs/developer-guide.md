# Hypertool Studio – Universal HyperFrame Guide

This document captures the current expectations for presets that run inside the Studio iframe. The legacy p5/Three wrappers have been replaced by a single **universal HyperFrame sandbox** that works for any visual runtime (canvas, SVG, WebGL, WebGPU, DOM, etc.).

## 1. Core Mental Model

- **HyperFrame owns the iframe environment.** It mirrors Studio CSS, injects the shared controls API, and exposes an export widget that captures PNG snapshots or WebM recordings.
- **Every preset boots via `window.hyperFrame.createSandbox`.** Pass optional `dependencies`, `controls`, `exportWidget`, and a `setup(context)` function. The `context` exposes:
  - `mount`: DOM element where your experience should render.
  - `params`: live control values.
  - `controls`: handle returned by the controls bridge (if controls were defined).
  - `exports`: helpers for configuring capture behaviour.
  - `environment`: `{ window, document, onResize(), addCleanup() }` utilities.
- **File layout is flexible.** You can organise code however the preset needs (React entry point, vanilla modules, shader files, etc.). HyperFrame no longer enforces a `sketch.ts`/`main.tsx` split.

## 2. Controls & Parameters

- Describe parameters with `controlDefinitions` (number, boolean, select, color, string) and pass them to `createSandbox({ controls: { definitions, options } })`.
- Respond to updates inside your rendering logic by reading `context.params`. If you need notifications, provide `controls: { onChange(change, context) { … } }` or use whatever state system you prefer.
- Never import or patch the Tweakpane bundle directly. HyperFrame bridges controls through `window.hypertoolControls` automatically.

## 3. Export Widget

- The sandbox always creates an export widget. Call `context.exports.useDefaultCanvasCapture()` (enabled by default) to let HyperFrame capture the first `<canvas>` inside the mount node.
- Override capture behaviour by registering handlers:
  ```ts
  context.exports.registerImageCapture(async () => canvasRef); // Canvas, Blob, data URL, or Promise
  context.exports.registerVideoCapture({
    requestStream: () => canvasRef.captureStream(60),
    mimeType: 'video/webm;codecs=vp9',
  });
  ```
- Update filenames with `context.exports.setFilename('my-visual')` or hide the widget using `context.exports.setVisible(false)` if you provide a custom UI.

## 4. Dependencies & Styling

- Use `dependencies: [{ type: 'script' | 'style', url, integrity?, crossOrigin?, attributes? }]` to load external assets before `setup` runs.
- Because CSS is mirrored from the parent document, the sandbox inherits Tailwind tokens, fonts, and theme variables. You can still inject additional styles if needed.

## 5. Cleanup & Lifecycle

- Return a disposer from `setup(context)` or register cleanups via `context.environment.addCleanup(() => …)`.
- Use `context.environment.onResize(() => …)` to react to iframe resizes without managing listeners manually.

## 6. Authoring Workflow for New Presets

1. Create any project structure you need (React, Three.js, Pixi, WebGPU, etc.).
2. Define `controlDefinitions` if the experience exposes knobs.
3. Call `window.hyperFrame.createSandbox({ ... })` from your entry module.
4. Inside `setup(context)`, mount your renderer, read `context.params`, and wire export overrides as desired.
5. Never edit `__hypertool__/…` bundles—`src/lib/boilerplate.ts` injects them automatically when building file maps.

## 7. AI Prompt Alignment

System prompts (see `src/config/prompts.js`) now describe this universal sandbox. AI responses must not reference the old `window.hyperFrame.p5`/`three` helpers. When reviewing patches, reject any change that reintroduces hard-coded framework bootstrappers.

With this model, HyperFrame becomes a thin but universal runtime shell: it handles controls, CSS, exports, and dependency loading while giving presets freedom to structure their creative code however they like.
