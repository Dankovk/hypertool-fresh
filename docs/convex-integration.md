# Convex Integration

This project uses [Convex](https://convex.dev) for database and file storage for boilerplates and code versions.

## Setup

1. Install Convex CLI (if not already installed):
   ```bash
   bun add -g convex
   ```

2. Initialize Convex project:
   ```bash
   bunx convex dev
   ```
   This will:
   - Create a Convex project (if it doesn't exist)
   - Generate the `_generated` files
   - Set up your Convex deployment URL

3. Configure environment variables:
   - Backend: Set `CONVEX_URL` environment variable
   - Frontend: Set `NEXT_PUBLIC_CONVEX_URL` environment variable
   
   These URLs are provided when you run `bunx convex dev` or can be found in your Convex dashboard.

## Migration

To migrate existing boilerplates to Convex, run:

```bash
export CONVEX_URL='your-convex-url'
bun run scripts/migrate-boilerplates.ts
```

## Schema

The Convex schema (`convex/schema.ts`) defines:
- `boilerplates`: Preset metadata with file storage references
- `codeVersions`: Code state snapshots with file storage references

## File Storage

Boilerplate files and code version files are stored in Convex file storage and referenced by storage IDs in the database tables. This allows efficient storage and retrieval of large file contents.

## Development

- Convex functions are in `convex/` directory
- Generated types are in `convex/_generated/`
- Backend uses `ConvexHttpClient` for server-side queries
- Frontend uses `ConvexReactClient` with React hooks (`useQuery`, `useMutation`)

## Fallback Behavior

The system gracefully falls back to local file-based storage if Convex is unavailable, ensuring the application continues to work during development or if Convex is not configured.

