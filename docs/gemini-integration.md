# Gemini Integration with Structured Output

## Overview

This document describes the parallel implementation for Gemini AI that ensures reliable, structured code generation using Vercel AI SDK's `streamObject` functionality.

## Problem Statement

Previously, the system used `streamText` for all models, which worked well with Claude but produced unreliable, unparseable responses with Gemini. The solution implements a dual-path approach:

- **Claude Path**: Uses `streamText` with JSON parsing (existing workflow)
- **Gemini Path**: Uses `streamObject` with Zod schemas for guaranteed structured output

## Architecture

### Backend (`backend/src/routes/ai-stream.ts`)

#### 1. Model Detection

```javascript
function isGeminiModel(model: string): boolean {
  return model.toLowerCase().includes('gemini');
}
```

Automatically detects Gemini models by checking the model string.

#### 2. Zod Schemas for Structured Output

**Patch Mode Schema:**
```javascript
const PatchModeSchema = z.object({
  edits: z.array(
    z.object({
      type: z.literal('search-replace'),
      filePath: z.string(),
      search: z.string(),
      replace: z.string(),
    })
  ),
  explanation: z.string().optional(),
});
```

**Full File Mode Schema:**
```javascript
const FullFileModeSchema = z.object({
  files: z.record(z.string(), z.string()),
  explanation: z.string().optional(),
});
```

#### 3. Dual Streaming Paths

**Gemini Path** (streamObject):
- Uses `streamObject` with Zod schema validation
- Streams `partialObjectStream` for incremental updates
- Guarantees structured output matching the schema
- No JSON parsing needed - objects are already validated

**Claude Path** (streamText):
- Uses `streamText` with freeform output
- Streams tokens individually
- Extracts JSON from response using regex
- Parses and validates manually

#### 4. System Prompts

Two sets of prompts are now available:

**Standard Prompts** (for Claude):
- `DEFAULT_SYSTEM_PROMPT_PATCH`
- `DEFAULT_SYSTEM_PROMPT_FULL`

**Gemini-Optimized Prompts**:
- `GEMINI_SYSTEM_PROMPT_PATCH`
- `GEMINI_SYSTEM_PROMPT_FULL`

Gemini prompts emphasize:
- Critical instruction to output valid JSON
- No explanatory text before/after JSON
- Explicit structure requirements
- Schema will be enforced automatically

### Frontend (`frontend/src/hooks/useAIChat.ts`)

#### Enhanced Logging

The frontend now includes comprehensive logging with:

1. **Request Initialization Logging**
   - Model detection (Gemini vs Claude)
   - Edit mode
   - User input preview
   - File count
   - Message history count

2. **Streaming Event Logging**
   - Start events with provider information
   - Token counting (logged every 100 tokens)
   - Progress updates (for Gemini)
   - Complete events with full statistics
   - Error events with detailed information

3. **Performance Metrics**
   - Event counts
   - Token counts
   - Duration tracking
   - Progress update counts

4. **Event-Specific Logging**
   ```
   [AI-CHAT-{timestamp}] 🚀 Starting AI Request
   [AI-CHAT-{timestamp}] 🎬 [START] Streaming started
   [AI-CHAT-{timestamp}] 📝 [TOKEN] Received {n} tokens
   [AI-CHAT-{timestamp}] 📊 [PROGRESS] Update message
   [AI-CHAT-{timestamp}] 🎉 [COMPLETE] Stream completed
   [AI-CHAT-{timestamp}] ❌ [ERROR] Error occurred
   ```

### Backend Logging

Backend includes detailed logging for:

1. **Model Selection**
   - Provider detection (Gemini/Claude)
   - Streaming approach selection
   - System prompt selection

2. **Streaming Process**
   - Token/partial object counts
   - Periodic progress updates
   - Usage statistics (input/output tokens)

3. **Processing Phase**
   - Edit/file validation
   - Patch application
   - File merging
   - Summary generation

4. **Completion/Error States**
   - Final file counts
   - Success/error indicators
   - Performance metrics

## Event Flow

### Gemini Flow

```
1. Request → Model Detection (Gemini) → Select streamObject
2. Load Gemini-specific system prompt
3. Initialize streamObject with Zod schema
4. Stream START event to frontend
5. Stream PROGRESS events as partial objects arrive
6. Accumulate final object
7. Log usage statistics
8. Process edits/files (common path)
9. Stream COMPLETE event with files
10. Frontend applies files
```

### Claude Flow

```
1. Request → Model Detection (Claude) → Select streamText
2. Load standard system prompt
3. Initialize streamText
4. Stream START event to frontend
5. Stream TOKEN events as text arrives
6. Accumulate full text
7. Extract and parse JSON
8. Log usage statistics
9. Process edits/files (common path)
10. Stream COMPLETE event with files
11. Frontend applies files
```

## Event Types

### Start Event
```json
{
  "type": "start",
  "provider": "gemini" | "claude"
}
```

### Token Event (Claude only)
```json
{
  "type": "token",
  "text": "...",
  "provider": "claude"
}
```

### Progress Event (Gemini only)
```json
{
  "type": "progress",
  "text": "Generating structured output... (update N)",
  "provider": "gemini"
}
```

### Complete Event
```json
{
  "type": "complete",
  "files": { "/path": "content", ... },
  "explanation": "Summary of changes",
  "mode": "patch" | "full",
  "provider": "gemini" | "claude"
}
```

### Error Event
```json
{
  "type": "error",
  "error": "Error message"
}
```

## Benefits of This Approach

### For Gemini
1. ✅ **Guaranteed Structure**: Zod schema ensures valid output
2. ✅ **No Parsing Errors**: No need to extract JSON from text
3. ✅ **Better Reliability**: Schema validation catches issues early
4. ✅ **Optimized Prompts**: Prompts tailored for structured output
5. ✅ **Type Safety**: TypeScript types derived from schemas

### For Claude
1. ✅ **Existing Workflow Preserved**: No breaking changes
2. ✅ **Flexible Output**: Can include explanations before JSON
3. ✅ **Token Streaming**: Real-time text display
4. ✅ **Backward Compatible**: Works with existing prompts

### General
1. ✅ **Comprehensive Logging**: Easy debugging and monitoring
2. ✅ **Clear Separation**: Each provider has its own path
3. ✅ **Extensible**: Easy to add new models
4. ✅ **Performance Metrics**: Track speed and efficiency

## Debugging

### Frontend Console

Look for log groups with timestamps:
```
[AI-CHAT-1730000000000] 🚀 Starting AI Request
  Model: gemini-2.5-pro (Gemini)
  Edit Mode: patch
  User Input: "..."
  Current Files: 5 files
  Message History: 3 messages
```

### Backend Console

Look for tagged logs:
```
[GEMINI] Using streamObject for structured generation
[GEMINI] Schema configuration { schemaName: 'CodeEdits', mode: 'patch' }
[GEMINI] Partial object update #5 { editCount: 3, ... }
[GEMINI] Final object received { editCount: 3, fileCount: 0, ... }
[GEMINI] Token usage { inputTokens: 1500, outputTokens: 800, ... }
```

## Testing

### Test with Gemini
1. Select a Gemini model (e.g., `gemini-2.5-pro`)
2. Make a change request
3. Check console for `[GEMINI]` logs
4. Verify `streamObject` is used
5. Confirm structured output

### Test with Claude
1. Select a Claude model (e.g., `claude-sonnet-4-5`)
2. Make a change request
3. Check console for `[CLAUDE]` logs
4. Verify `streamText` is used
5. Confirm JSON parsing

## Configuration

### Enable/Disable Gemini Models

Edit `packages/shared-config/models.js`:

```javascript
export const MODEL_OPTIONS = [
  // Gemini models
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", ... },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", ... },
  
  // Claude models
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", ... },
];
```

### Customize System Prompts

Edit `packages/shared-config/prompts.js`:

```javascript
export const GEMINI_SYSTEM_PROMPT_PATCH = `...`;
export const GEMINI_SYSTEM_PROMPT_FULL = `...`;
```

## Troubleshooting

### Issue: Gemini returns unstructured output
**Solution**: Check that `isGeminiModel()` is detecting the model correctly and that `streamObject` is being used.

### Issue: Schema validation fails
**Solution**: Check backend logs for validation errors. The Zod schema may need adjustment based on actual model output.

### Issue: No progress updates for Gemini
**Solution**: Check that frontend is handling "progress" events correctly. These are Gemini-specific.

### Issue: Claude output not displaying
**Solution**: Check that "token" events are being streamed and accumulated correctly.

## Future Enhancements

1. **Add More Schemas**: Support for different output formats
2. **Streaming Partial UI Updates**: Show partial edits as they arrive
3. **Model-Specific Optimizations**: Fine-tune prompts per model
4. **Retry Logic**: Automatic fallback if structured output fails
5. **Schema Evolution**: Version schemas for backward compatibility

## References

- [Vercel AI SDK - streamObject](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object)
- [Zod Schema Validation](https://zod.dev/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0

