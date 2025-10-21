# @hypertool/runtime

Unified runtime bundle that powers Hypertool Studio sketches. It packages the styled controls UI and the HyperFrame sketch lifecycle helpers into a single library with multiple entry points.

## Entry points

- `@hypertool/runtime` – convenience re-exports for both modules.
- `@hypertool/runtime/controls` – Hypertool themed controls built on top of Tweakpane.
- `@hypertool/runtime/frame` – HyperFrame helpers for p5.js and Three.js sketches.

## Features

- 🎨 **Studio native controls** – tweakpane UI that inherits Studio design tokens.
- 🚀 **Lifecycle helpers** – batteries-included mounting utilities for p5.js and Three.js.
- 🔁 **Hot rebuild ready** – `bun run dev` keeps the dist bundles fresh while `npm run dev` is running.
- 📦 **Single distribution** – one library produces both control and frame bundles.

## Usage inside presets

The runtime bundles are injected automatically into the WebContainer filesystem. The helpers are available under the `window.hypertoolControls` and `window.hyperFrame` namespaces.

```ts
import { startThreeSketch } from "./__hypertool__/frame/index.js";
import { createControls } from "./__hypertool__/controls/index.js";
```

The TypeScript sources live in:

- `hyper-runtime/src/controls/*`
- `hyper-runtime/src/frame/index.ts`

Run `bun run build` to produce distributable bundles, or `bun run dev` for watch mode.
