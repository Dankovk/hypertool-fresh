# Production Cleanup Guide

This document outlines what needs to be cleaned up for production deployment.

## ✅ Completed

### 1. Unified System Prompts Created
- `UNIFIED_SYSTEM_PROMPT_PATCH` - Works with all AI models
- `UNIFIED_SYSTEM_PROMPT_FULL` - For full file generation
- Location: `packages/shared-config/prompts.js`

**To Use**: Update `ai-stream.ts` to use unified prompts instead of model-specific ones:
```typescript
// Replace this:
const defaultPrompt = useGemini
  ? (usePatchMode ? GEMINI_SYSTEM_PROMPT_PATCH : GEMINI_SYSTEM_PROMPT_FULL)
  : (usePatchMode ? DEFAULT_SYSTEM_PROMPT_PATCH : DEFAULT_SYSTEM_PROMPT_FULL);

// With this:
const defaultPrompt = usePatchMode 
  ? UNIFIED_SYSTEM_PROMPT_PATCH 
  : UNIFIED_SYSTEM_PROMPT_FULL;
```

## 🔧 Cleanup Needed

### Backend: `backend/src/routes/ai-stream.ts`

**Remove**:
1. All `logger.debug()` calls - excessive for production
2. All `logger.info()` calls with detailed metadata
3. Verbose error logging with file content previews
4. Similarity analysis and whitespace checking logs
5. Token usage logging

**Keep**:
1. `logger.error()` for critical failures
2. `logger.warn()` for validation issues (invalid edits filtered)
3. Essential error information for debugging

**Example - Before**:
```typescript
logger.info('[GEMINI] streamObject initialized, starting to consume stream');
logger.debug(`[GEMINI] Partial object update #${count}`);
logger.info('[GEMINI] Final object received', { hasEdits, editCount, ... });
logger.info('[GEMINI] Token usage', { inputTokens, outputTokens });
```

**Example - After**:
```typescript
// Remove all of the above - production doesn't need verbose streaming logs
```

**Add Comments For**:
1. Validation logic (why we filter invalid edits)
2. Dual streaming approach (Gemini vs Claude/Other)
3. Partial success handling
4. Schema selection logic

**Example**:
```typescript
// Validate edits: filter out those with empty search strings or undefined replace
// This prevents patch application failures from malformed AI output
const validEdits = normalizedEdits.filter((edit, index) => {
  // Search string must be non-empty (at least 10 chars per schema)
  if (!edit.search || edit.search.trim() === '') {
    invalidEdits.push({ ... });
    return false;
  }
  return true;
});
```

---

### Frontend: `frontend/src/hooks/useAIChat.ts`

**Remove**:
1. All `console.log` / `console.group` / `console.groupEnd` calls
2. Detailed event logging (token counts, progress updates)
3. Streaming statistics (`totalEvents`, `totalTokens`, etc.)
4. `logPrefix` variable and all uses

**Keep**:
1. `console.error()` for critical errors only
2. Essential error logging with user-actionable information

**Example - Before**:
```typescript
console.group(`${logPrefix} 🚀 Starting AI Request`);
console.log(`Model: ${model}`);
console.log(`${logPrefix} 📡 Sending request to: ${url}`);
console.log(`${logPrefix} 🎬 [START] Streaming started`);
console.log(`${logPrefix} 📝 [TOKEN] Received ${tokenCount} tokens`);
console.log(`${logPrefix} ✅ Stream ended successfully`);
console.groupEnd();
```

**Example - After**:
```typescript
// Remove all console logs - keep only errors
try {
  // ... fetch and stream logic ...
} catch (err) {
  console.error('AI request failed:', err.message);
  // Show user-friendly error
}
```

**Add Comments For**:
1. Abort controller usage
2. SSE event handling
3. File validation and application logic

---

### Backend: `backend/src/lib/patches.ts`

**Remove**:
1. All `console.debug()` calls
2. `process.env.NODE_ENV !== 'production'` debug blocks

**Keep**:
1. Essential logic comments
2. Error handling

**Example - Before**:
```typescript
const newFiles = { ...files };
if (process.env.NODE_ENV !== 'production') {
  console.debug('[patches] initial files:', Object.keys(newFiles));
}
```

**Example - After**:
```typescript
// Apply edits to file map
const newFiles = { ...files };
```

**Add Comments For**:
1. Fuzzy matching logic (why we normalize whitespace)
2. File path normalization
3. Edit application algorithm

---

## 📋 Checklist for Production

### Code Cleanup
- [ ] Remove all debug logs from `ai-stream.ts`
- [ ] Remove all console logs from `useAIChat.ts`
- [ ] Remove debug logs from `patches.ts`
- [ ] Add clear comments to complex logic
- [ ] Switch to unified system prompts

### Testing
- [ ] Test Gemini model with unified prompt
- [ ] Test Claude model with unified prompt
- [ ] Test error handling (network, patch, validation)
- [ ] Test cancel functionality
- [ ] Test partial success scenarios

### Configuration
- [ ] Set appropriate log levels for production
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up monitoring for patch success rates
- [ ] Configure rate limiting for AI requests

### Documentation
- [ ] Update API documentation
- [ ] Document system prompt customization
- [ ] Add deployment guide
- [ ] Create troubleshooting guide for users

---

## 🎯 Quick Production Deploy Script

```bash
# 1. Apply unified prompts
# Edit backend/src/routes/ai-stream.ts
# Replace model-specific prompts with unified ones

# 2. Remove debug logging
# Run this to find all console/logger calls:
grep -r "console\\." frontend/src/hooks/useAIChat.ts
grep -r "logger\\.(debug|info)" backend/src/routes/ai-stream.ts

# 3. Build for production
cd frontend && npm run build
cd ../backend && bun run build

# 4. Test critical paths
npm run test:integration

# 5. Deploy
# Follow your deployment process
```

---

## 🔒 Security Checklist

- [ ] Remove any hardcoded API keys
- [ ] Validate all user inputs
- [ ] Rate limit AI requests
- [ ] Sanitize error messages (no internal paths/data)
- [ ] Enable CORS appropriately
- [ ] Use HTTPS in production
- [ ] Implement authentication if needed

---

## 📊 Monitoring Recommendations

### Log What Matters:
1. **Errors**: All AI request failures
2. **Warnings**: Partial success, invalid edits filtered
3. **Metrics**: Request count, success rate, latency

### Don't Log:
1. Full file contents
2. Detailed token counts
3. Streaming progress
4. Debug timing information

### Example Production Logger:
```typescript
// Good - actionable errors
logger.error('AI request failed', { model, error: err.message });

// Good - important warnings
logger.warn('Filtered invalid edits', { count: invalidEdits.length });

// Bad - too verbose
logger.debug('Streaming token #1523...');
logger.info('File content preview: ...');
```

---

## 🎉 Benefits of Cleanup

1. **Performance**: Less logging = faster response times
2. **Security**: No sensitive data in logs
3. **Clarity**: Easier to find real issues
4. **Cost**: Reduced log storage costs
5. **Professionalism**: Clean, production-ready code

---

**Version**: 1.0  
**Last Updated**: November 1, 2025  
**Status**: Ready for cleanup implementation

