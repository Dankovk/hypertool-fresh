# Convex Setup Instructions

## Quick Start

1. **Install Convex CLI** (if not already installed):
   ```bash
   bun add -g convex
   ```

2. **Initialize Convex project**:
   ```bash
   bun run dev:convex
   ```
   
   Or manually:
   ```bash
   bun run scripts/pre-convex.sh
   bunx convex dev
   ```
   
   This will:
   - Clean up any existing .js files
   - Prompt you to create a new Convex project or link to an existing one
   - Generate the `_generated` folder with type definitions
   - Start the Convex dev server
   - Provide you with the deployment URL

3. **Set environment variables**:
   
   After initialization, you'll get a URL like `https://your-project.convex.cloud`
   
   **Backend** (`.env` or environment):
   ```bash
   export CONVEX_URL="https://your-project.convex.cloud"
   ```
   
   **Frontend** (`.env.local` or environment):
   ```bash
   export NEXT_PUBLIC_CONVEX_URL="https://your-project.convex.cloud"
   ```

4. **Migrate existing boilerplates** (optional):
   ```bash
   export CONVEX_URL="https://your-project.convex.cloud"
   bun run migrate:boilerplates
   ```
   
   This will read all boilerplates from `packages/boilerplate-presets` (excluding `__non-migrated__`) and upload them to Convex.

## Development

- Run `bunx convex dev` alongside your development servers
- Convex functions are hot-reloaded automatically
- Check the Convex dashboard at https://dashboard.convex.dev for your project

## Project Structure

```
convex/
├── schema.ts          # Database schema definition
├── boilerplates.ts    # Boilerplate CRUD operations
├── codeVersions.ts    # Code version CRUD operations
├── _generated/        # Auto-generated types (do not edit)
└── tsconfig.json      # TypeScript config for Convex functions
```

## How It Works

1. **Boilerplates**: Preset templates are stored in Convex with file contents in Convex file storage
2. **Code Versions**: Code state snapshots are stored in Convex with file contents in Convex file storage
3. **Fallback**: The system gracefully falls back to local file-based storage if Convex is unavailable

## Troubleshooting

- **Type errors**: Run `bunx convex dev` to regenerate types
- **Connection errors**: Verify `CONVEX_URL` and `NEXT_PUBLIC_CONVEX_URL` are set correctly
- **Missing data**: Run the migration script to populate Convex with existing boilerplates
- **"Two output files share the same path" error**: 
  - This happens when Convex tries to compile both `.ts` and `.js` files
  - Make sure to use `bun run dev:convex` which runs cleanup automatically
  - If the error persists, manually delete any `.js` files in `convex/` directory (except `_generated/`)
  - Stop Convex (`Ctrl+C`), run `bun run scripts/pre-convex.sh`, then restart

