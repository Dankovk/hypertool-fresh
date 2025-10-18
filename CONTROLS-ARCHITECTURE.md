# Hypertool Controls Architecture

## Overview

A simplified controls system that eliminates iframe communication complexity by injecting a pre-built controls library directly into Sandpack previews.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Sandpack Preview (Iframe)                      │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  /shared/hypertool-controls.js            │ │
│  │  - HypertoolControls class                │ │
│  │  - Tweakpane (bundled)                    │ │
│  │  - Studio theme (CSS variables)           │ │
│  └───────────────────────────────────────────┘ │
│                  ▼                              │
│  ┌───────────────────────────────────────────┐ │
│  │  User's sketch.js                         │ │
│  │  import { createControls } from '/shared' │ │
│  │  const params = createControls({...})     │ │
│  │  // Use params directly!                  │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**No parent-iframe communication needed!**

## Directory Structure

```
fresh-breeze/
├── controls-lib/              # TypeScript library source
│   ├── src/
│   │   ├── index.ts          # Main exports
│   │   ├── HypertoolControls.ts  # Core class
│   │   ├── simple-api.ts     # createControls() API
│   │   ├── theme.ts          # Studio theme integration
│   │   └── types.ts          # TypeScript definitions
│   ├── dist/                 # Built output (ESM)
│   │   └── index.js          # Bundled library
│   ├── package.json          # Build configuration
│   └── tsconfig.json
│
├── boilerplate-presets/
│   ├── shared/               # Shared resources
│   │   └── hypertool-controls.js  # Built library (copied from dist)
│   └── simple-with-controls/  # Example preset
│       ├── index.html
│       ├── sketch.js         # Uses createControls()
│       └── package.json
│
└── src/
    ├── config/
    │   └── prompts.ts        # CONTROLS_SYSTEM_PROMPT
    └── lib/
        └── boilerplate.ts    # Loads shared + preset files
```

## Build Process

### 1. Build the Controls Library

```bash
bun run build:controls
```

This:
1. Compiles TypeScript → ESM JavaScript (controls-lib/dist/index.js)
2. Bundles Tweakpane library
3. Injects Studio theme CSS variables
4. Copies to boilerplate-presets/shared/hypertool-controls.js

### 2. Automatic Injection

The `loadBoilerplateFiles()` function (src/lib/boilerplate.ts) automatically:
1. Loads all files from `boilerplate-presets/shared/`
2. Loads preset-specific files
3. Merges them (preset files override shared)
4. Returns complete file map to Sandpack

## Usage in Sketches

### Simple API (Recommended)

```javascript
import { createControls } from '/shared/hypertool-controls.js';

const params = createControls({
  speed: {
    type: 'number',
    label: 'Speed',
    value: 1,
    min: 0,
    max: 10,
    step: 0.1
  },
  color: {
    type: 'color',
    label: 'Color',
    value: '#58d5ff'
  },
  enabled: {
    type: 'boolean',
    label: 'Enabled',
    value: true
  }
});

// params updates automatically!
function draw() {
  circle(x, y, params.speed * 10);
}
```

### Advanced API

```javascript
import { createControlPanel } from '/shared/hypertool-controls.js';

const controls = createControlPanel({
  // ... definitions
}, {
  title: 'My Controls',
  position: 'top-right',
  onChange: (params) => console.log('Changed:', params)
});

// Programmatic access
controls.set('speed', 5);
controls.setVisible(false);
controls.destroy();
```

## Theme Integration

The library automatically inherits Studio theme at build time:

**From src/app/globals.css:**
```css
:root {
  --bg: #0a0e14;
  --accent: #58d5ff;
  --text: #e6edf3;
  /* ... etc */
}
```

**Injected into controls-lib/src/theme.ts:**
```typescript
export const studioTheme = {
  cssVariables: {
    '--bg': '#0a0e14',
    '--accent': '#58d5ff',
    /* ... synchronized at build time */
  }
};
```

**Result:** Controls always match Studio's appearance!

## AI System Prompt

The `CONTROLS_SYSTEM_PROMPT` in `src/config/prompts.ts` instructs the AI to:

1. Always use `import { createControls } from '/shared/hypertool-controls.js'`
2. Define parameters with types (number, color, boolean, string, select)
3. Use `params.propertyName` directly (no event listeners needed)
4. Include proper ESM setup (`type="module"` in HTML/package.json)
5. **Never** use postMessage, iframe communication, or Tweakpane directly

## Benefits vs. Previous Approach

### ❌ Old: Iframe Communication

```
- 2 Tweakpane instances (parent + iframe)
- postMessage for syncing
- Race conditions
- Security concerns (origin validation)
- 500+ lines of communication code
- Duplicate state management
```

### ✅ New: Injected Library

```
- 1 Tweakpane instance (inside iframe)
- No communication needed
- No race conditions
- No security issues
- ~50 lines in user code
- Single source of truth
```

**Code reduction: ~90%**

## Type Safety

Full TypeScript support with type inference:

```typescript
const params = createControls({
  speed: { type: 'number', value: 1 },
  color: { type: 'color', value: '#ff0000' }
});

// TypeScript knows:
// params.speed: number
// params.color: string

params.speed.toFixed(2);      // ✅ OK
params.color.toUpperCase();   // ✅ OK
```

## Maintenance

### Updating Styles

1. Edit `src/app/globals.css`
2. Run `bun run build:controls`
3. Changes automatically reflected in controls

### Adding Control Types

1. Add type to `controls-lib/src/types.ts`
2. Handle in `HypertoolControls.ts`
3. Rebuild
4. Document in `CONTROLS_SYSTEM_PROMPT`

### Updating Tweakpane

1. Update version in `controls-lib/package.json`
2. Run `bun install` in controls-lib/
3. Rebuild

## Example Presets

- **simple-with-controls**: Minimal p5.js example with controls
- All other presets can use the same pattern

## Troubleshooting

### Controls not appearing
- Check browser console for import errors
- Verify `/shared/hypertool-controls.js` is in Sandpack files
- Ensure `<script type="module">` is used

### Types not working
- Make sure to use ESM imports, not `require()`
- Check that `type: "module"` is in package.json

### Theme not matching
- Run `bun run build:controls` after changing globals.css
- Clear browser cache if needed

## Future Enhancements

- [ ] Hot reload on theme changes
- [ ] Preset templates with common control patterns
- [ ] Advanced control types (range, vector, gradient)
- [ ] Export/import control state
- [ ] Control groups/folders
- [ ] Keyboard shortcuts for controls
