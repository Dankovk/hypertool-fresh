## Fresh Breeze Monorepo

- apps/studio: Next.js AI chat + live p5 preview
- apps/boilerplate: Barebones p5 project used as the AI starting point

Install deps (Bun only):

```bash
bun install
```

Run Studio (UI):

```bash
bun run dev:studio
```

Notes:
- The AI endpoint is stubbed by default. Set `OPENAI_API_KEY` in `apps/studio/.env.local` to enable OpenAI.
- The preview always reflects the latest full file map returned by the AI.

