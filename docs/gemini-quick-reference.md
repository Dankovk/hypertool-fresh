# Gemini Integration - Quick Reference

## 🚀 Quick Start

### Using Gemini Models

1. Open the app
2. Select a Gemini model from settings (e.g., `gemini-2.5-pro`)
3. Make your code change request
4. Watch the console for detailed logs

### Checking Which Path is Used

**Frontend Console:**
```javascript
// Look for this in the console:
[AI-CHAT-xxxxx] 🚀 Starting AI Request
  Model: gemini-2.5-pro (Gemini)  // ← This shows Gemini is detected
```

**Backend Console:**
```javascript
// Look for:
🟢 [GEMINI] Using streamObject for structured generation
// OR
🔵 [CLAUDE] Using streamText with JSON parsing
```

## 🔍 Debugging Checklist

### Frontend

- [ ] Model name contains "gemini"
- [ ] Request initialized with correct model
- [ ] "progress" events received (Gemini only)
- [ ] "complete" event received with files
- [ ] Files validated and applied

### Backend

- [ ] `isGeminiModel()` returns true
- [ ] Gemini-specific prompt selected
- [ ] `streamObject` initialized (not `streamText`)
- [ ] Zod schema validation succeeds
- [ ] Final object contains `edits` (patch) or `files` (full)

## 📊 Key Differences

| Feature | Gemini Path | Claude Path |
|---------|-------------|-------------|
| **API** | `streamObject` | `streamText` |
| **Output** | Structured object | Free-form text |
| **Validation** | Zod schema (automatic) | JSON parsing (manual) |
| **Events** | `progress` | `token` |
| **Reliability** | High (guaranteed structure) | Medium (depends on prompt) |
| **Parsing** | Not needed | Regex + JSON.parse |
| **Prompt** | `GEMINI_SYSTEM_PROMPT_*` | `DEFAULT_SYSTEM_PROMPT_*` |

## 🔧 Common Issues & Solutions

### Issue: "Failed to parse AI response"
**Likely Cause**: Using streamText for Gemini  
**Solution**: Ensure `isGeminiModel()` detects the model correctly

### Issue: "No valid edits generated"
**Likely Cause**: Schema doesn't match model output  
**Solution**: Check backend logs for validation details

### Issue: No progress updates showing
**Likely Cause**: Frontend not handling "progress" events  
**Solution**: Check frontend event handler for `event.type === "progress"`

### Issue: Gemini returning empty objects
**Likely Cause**: System prompt not clear enough  
**Solution**: Update `GEMINI_SYSTEM_PROMPT_*` in `packages/shared-config/prompts.js`

## 📝 Log Markers

### Frontend Markers
- 🚀 = Request start
- 🎬 = Stream start
- 📝 = Token received
- 📊 = Progress update
- 🎉 = Complete
- ❌ = Error
- 🏁 = Request finished

### Backend Markers
- 🟢 = Gemini path
- 🔵 = Claude path
- ✅ = Success
- ❌ = Error

## 🧪 Testing Commands

### Test Gemini
```javascript
// In browser console while app is running:
console.log('Current model:', /* check settings */);
// Should contain "gemini"
```

### Monitor Events
```javascript
// Add this to frontend code for debugging:
window.addEventListener('message', (e) => {
  if (e.data.type) console.log('Event:', e.data);
});
```

### Backend Logs
```bash
# In terminal running backend:
# Look for lines containing:
# [GEMINI] or [CLAUDE]
```

## 🎯 Performance Tips

1. **Gemini is faster** with structured output (no parsing overhead)
2. **Claude shows real-time text** (better UX for long responses)
3. **Log every 100 tokens** (not every token) to reduce overhead
4. **Progress updates every 5 iterations** for Gemini (not every one)

## 📚 File Locations

| What | Where |
|------|-------|
| Backend streaming | `backend/src/routes/ai-stream.ts` |
| Frontend hook | `frontend/src/hooks/useAIChat.ts` |
| System prompts | `packages/shared-config/prompts.js` |
| Model config | `packages/shared-config/models.js` |
| Schemas | `backend/src/routes/ai-stream.ts` (lines 31-49) |
| Full docs | `docs/gemini-integration.md` |

## 🔗 Useful Links

- [Vercel AI SDK Docs](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-object)
- [Zod Documentation](https://zod.dev/)
- [Gemini API Docs](https://ai.google.dev/docs)

---

**Last Updated**: November 1, 2025

