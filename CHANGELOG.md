# Changelog

## [2.0.0] - 2025-10-06

### Added

#### Multi-Provider Architecture
- **Smart Provider Routing**: Automatic provider detection based on model name prefix
  - `claude-*` → Anthropic
  - `gemini-*` → Google
  - `gpt-*`, `o1*`, `o3*` → OpenAI
- **User API Key Override**: User-provided keys always take precedence over environment variables
- **Graceful Fallback**: Environment variables used when no user key provided

#### New AI Models (12 Total)

**Anthropic Claude (4 models)**
- Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) - Latest, fast, creative
- Claude Opus 4 (`claude-opus-4-20250514`) - Best for complex creative work
- Claude Sonnet 3.7 (`claude-3-7-sonnet-20250219`) - Fast and reliable
- Claude Haiku 3.5 (`claude-3-5-haiku-20241022`) - Cost-effective

**Google Gemini (3 models)**
- Gemini 2.0 Flash (`gemini-2.0-flash-exp`) - Latest experimental, fast
- Gemini 1.5 Pro (`gemini-1.5-pro-latest`) - Large context window
- Gemini 1.5 Flash (`gemini-1.5-flash-latest`) - Cost-effective

**OpenAI (5 models - existing)**
- GPT-5, GPT-4o, O1, O1 Mini, O3 Mini

#### Version History System
- Automatic saving of last 10 code generations
- Each version includes:
  - Timestamp
  - Model used
  - Original prompt
  - Complete file map
- One-click restore to previous versions
- Modal interface for browsing history
- "History" button appears after first generation

#### Preset Library System
- 5 built-in creative coding templates:
  1. **Blank Canvas**: Clean slate
  2. **Particle System**: 100 bouncing particles with trails
  3. **Perlin Waves**: Dual-wave Perlin noise animation
  4. **Fractal Tree**: Mouse-controlled recursive tree
  5. **Generative Grid**: Click-to-regenerate random grid
- Each preset includes:
  - `index.html`: HTML structure
  - `sketch.js`: p5.js code
  - `package.json`: Metadata (name, description)
- API endpoint: `GET /api/boilerplate?preset={id}`
- List endpoint: `GET /api/boilerplate?action=list`

#### UI Improvements
- **Grouped Model Selector**: Models organized by provider (OpenAI, Anthropic, Google)
- **Visual Indicators**: ⭐ marks latest/recommended models
- **Preset Modal**: Browse and select templates
- **Version History Modal**: Timeline of previous generations
- **New Buttons**:
  - "Presets" (Template icon)
  - "History" (Clock icon)
  - "Reset" (Refresh icon)

### Changed
- **Model Selection**: Now shows provider names in grouped optgroups
- **API Route Logic**: Refactored to support multiple providers dynamically
- **Settings Storage**: API keys stored per-provider in localStorage
- **Error Messages**: Improved provider-specific error messages

### Technical Details

#### Files Modified
- `src/app/api/ai/route.ts`: Multi-provider routing logic
- `src/app/page.tsx`: Version history, preset selection, updated UI
- `src/lib/boilerplate.ts`: Preset library functions
- `src/app/api/boilerplate/route.ts`: Preset API endpoints
- `README.md`: Comprehensive documentation update
- `.env.example`: Added ANTHROPIC_API_KEY and GOOGLE_API_KEY

#### Files Created
- `boilerplate-presets/blank/`: Blank canvas preset
- `boilerplate-presets/particles/`: Particle system preset
- `boilerplate-presets/waves/`: Perlin wave preset
- `boilerplate-presets/fractal/`: Fractal tree preset
- `boilerplate-presets/generative-art/`: Generative grid preset
- `CHANGELOG.md`: This file

#### Dependencies
- Existing AI SDK packages utilized:
  - `@ai-sdk/anthropic`: ^1.0.5
  - `@ai-sdk/google`: ^1.0.5
  - `@ai-sdk/openai`: ^2.0.42

### Architecture Highlights

```typescript
// Smart provider detection with user override
function getProviderForModel(model: string, userApiKey?: string) {
  // User key always takes precedence
  if (userApiKey?.trim()) {
    if (model.startsWith('claude-')) return createAnthropic({ apiKey: userApiKey });
    if (model.startsWith('gemini-')) return createGoogle({ apiKey: userApiKey });
    if (model.startsWith('gpt-') || model.startsWith('o1')) return createOpenAI({ apiKey: userApiKey });
  }

  // Fallback to environment variables
  // ... provider-specific env key logic
}
```

### Migration Notes
- Existing projects continue to work with OpenAI models
- No breaking changes to API
- Optional: Add new provider API keys to `.env.local`
- Settings automatically migrate to new format

### Future Enhancements (Not Implemented)
- Streaming support for real-time updates
- Token usage tracking and cost estimation
- Model comparison mode
- Response caching
- Export/import presets
