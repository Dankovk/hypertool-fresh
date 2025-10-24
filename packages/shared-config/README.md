# @hypertool/shared-config

Shared configuration files used across the Hypertool Fresh Breeze monorepo.

## Purpose

This package contains configuration that needs to be consistent across multiple applications:

- **models.ts** - AI model options and defaults for both frontend and backend
- **paths.ts** - Build paths and locations for hyper-runtime bundles
- **prompts.js** - System prompts for AI assistants

## Usage

Import from the shared config package using the workspace alias:

```typescript
// Models config
import { MODEL_OPTIONS, DEFAULT_MODEL } from '@hypertool/shared-config/models';

// Paths config
import { HYPER_RUNTIME_DIST_FROM_BACKEND, BUNDLE_PATH } from '@hypertool/shared-config';

// Prompts config
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_FULL } from '@hypertool/shared-config/prompts';
```

## Benefits

✅ **Single source of truth** - Update config in one place
✅ **Consistency** - Frontend and backend always use the same config
✅ **Type safety** - TypeScript ensures correct usage everywhere
✅ **No duplication** - Eliminates version drift between apps

## Structure

```
shared-config/
├── package.json       # Package metadata and exports
├── models.ts          # AI model options
├── paths.ts           # Build and runtime paths
├── prompts.js         # AI system prompts
└── README.md          # This file
```
