### Studio (Next.js)

AI-powered p5.js creative coding environment with multi-model support

## Features

- **Multi-Provider AI Support**: OpenAI, Anthropic Claude, Google Gemini
- **Live Preview**: Real-time p5.js preview with Sandpack
- **Version History**: Track and restore previous code generations
- **Preset Library**: 5 built-in creative coding templates
- **Code Download**: Export projects as ZIP files
- **Patch-Based Editing**: Efficient code modifications using search/replace blocks (90%+ token savings)
- **Edit History & Undo/Redo**: Full history tracking with undo/redo support

## Supported Models

### OpenAI
- GPT-5 (Latest)
- GPT-4o
- O1 (Reasoning)
- O1 Mini
- O3 Mini

### Anthropic Claude
- Claude Sonnet 4.5 ⭐ (Latest, fast, creative)
- Claude Opus 4 (Best for complex work)
- Claude Sonnet 3.7
- Claude Haiku 3.5 (Cost-effective)

### Google Gemini
- Gemini 2.0 Flash ⭐ (Latest, fast)
- Gemini 1.5 Pro (Large context)
- Gemini 1.5 Flash (Cost-effective)

## Setup

1. Copy environment variables:
```bash
cp .env.example .env.local
```

2. Add your API keys (at least one required):
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
GOOGLE_API_KEY=...
```

3. Run with Bun:
```bash
bun run dev
```

## Preset Templates

- **Blank Canvas**: Clean slate for new creations
- **Particle System**: Animated bouncing particles
- **Perlin Waves**: Smooth flowing wave animations
- **Fractal Tree**: Interactive recursive tree (mouse-controlled)
- **Generative Grid**: Randomized grid patterns

## Features in Detail

### Version History
- Automatically saves last 10 code generations
- One-click restore to any previous version
- Shows timestamp, model used, and original prompt

### Smart Provider Routing
- User API key overrides environment keys
- Automatic provider detection from model name
- Fallback to environment variables when no user key provided

### Code Generation
- **Patch Mode** (NEW): Precise search/replace edits with context-aware fuzzy matching
- **Full Mode**: Complete file regeneration for major rewrites
- Preserves existing code structure
- AI-powered explanations of changes

### Patch-Based Editing (NEW)
Modern AI coding assistant approach for efficient, precise code modifications:
- Search/replace blocks instead of full file regeneration
- Context-based fuzzy matching handles whitespace variations
- 90%+ reduction in output tokens
- Full edit history with undo/redo support
- See [PATCH_EDITING.md](./PATCH_EDITING.md) for detailed documentation

**Quick Example:**
```typescript
// Request patch mode
fetch("/api/ai", {
  method: "POST",
  body: JSON.stringify({
    messages: [{ role: "user", content: "Change circle color to red" }],
    model: "claude-3-5-sonnet-20241022",
    editMode: "patch", // Enable patch mode
    currentFiles: {...}
  })
})
```

