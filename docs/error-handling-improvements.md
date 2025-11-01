# Error Handling & Partial Success Improvements

## Problem Statement

Complex AI requests were causing issues:
1. **Missing search/replace strings** - Some edits had undefined values
2. **UI freezing** - When errors occurred, the UI would freeze
3. **All-or-nothing** - If one edit failed, everything failed
4. **Poor error messages** - Users didn't know what went wrong or how to fix it

## Solutions Implemented

### 1. ✅ Strict Schema Validation

**Before:**
```typescript
search: z.string() // Could be empty or undefined
replace: z.string() // Could be empty or undefined
```

**After:**
```typescript
search: z.string().min(1) // Required, non-empty
replace: z.string().min(0) // Required, but can be empty (for deletion)
edits: z.array(...).min(1) // Must have at least one edit
```

**Impact:** Prevents Gemini from generating invalid edits with missing search/replace strings.

---

### 2. ✅ Partial Success Support

**Before:** If ANY edit failed, the entire operation failed and nothing was applied.

**After:** Successfully applied edits are kept, failed edits are reported.

**Example:**
```
Request: "Make 5 changes to main.ts"
Result: 
- ✅ 3 edits applied successfully
- ❌ 2 edits failed
- User gets the 3 working changes + clear report of what failed
```

**Backend Logic:**
```typescript
// Count successful and failed edits
const successfulEdits = results.filter(r => r.success).length;
const failedEdits = results.filter(r => !r.success).length;

// Only throw error if ALL edits failed
if (successfulEdits === 0) {
  throw new Error("All edits failed");
}

// Continue with partial success
if (successfulEdits > 0) {
  // Apply what worked, warn about failures
}
```

---

### 3. ✅ Warning Events

**New Event Type: `warning`**

Sent to frontend when some edits fail:
```json
{
  "type": "warning",
  "message": "Partial success: 3 of 5 edits applied. 2 failed.",
  "details": {
    "successful": 3,
    "failed": 2,
    "total": 5
  }
}
```

**Frontend displays:**
- Toast notification with warning
- Details in console
- Updated message showing what succeeded/failed

---

### 4. ✅ Enhanced Summary Messages

**Before:**
```
Applied 5 edits to 1 file
```

**After (full success):**
```
✅ Successfully applied 5 edits to 1 file

✅ Edit 1: /main.ts
   Modified: "function draw() {"
✅ Edit 2: /main.ts
   Modified: "const canvas = ..."
...
```

**After (partial success):**
```
⚠️ Partial Success: Applied 3 of 5 edits
❌ 2 edits failed (see console for details)

✅ Edit 1: /main.ts
   Modified: "function draw() {"
✅ Edit 2: /main.ts
   Modified: "const canvas = ..."
❌ Edit 3: /main.ts
   Error: Search string not found in file
...

💡 Tip: Try switching to "Full File Mode" in settings for complex changes
```

---

### 5. ✅ Improved Error Messages

**User-friendly categorized errors:**

**Network Errors:**
```
"Network error. Please check your connection and try again."
```

**Patch Errors:**
```
"Failed to apply some changes. Try:
• Switching to Full File mode
• Using a different model
• Simplifying your request"
```

**Generic Errors:**
```
Shows the actual error message from backend
```

---

### 6. ✅ Guaranteed No UI Freeze

**Improvements:**

1. **Loading state always cleared:**
```typescript
finally {
  setLoading(false); // ALWAYS runs, even on error
  console.log('Request complete, loading state cleared');
}
```

2. **Error message shown in chat:**
```typescript
catch (err) {
  // Update last message to show error
  updateLastMessage?.(`❌ Error: ${errorMessage}`);
}
```

3. **Toast notifications:**
- Success: Green toast
- Warning: Yellow toast (partial success)
- Error: Red toast with suggestions

---

## New Event Types

### Complete Event Type Reference

| Event Type | When Sent | Frontend Action |
|------------|-----------|-----------------|
| `start` | Stream begins | Log start time |
| `token` | Token received (Claude) | Accumulate text |
| `progress` | Progress update (Gemini) | Show progress |
| `warning` | Partial success | Show warning toast |
| `complete` | Stream finished | Apply files |
| `error` | Fatal error | Show error, clear loading |

---

## Backend Logging Improvements

### Partial Success Logs

```javascript
[PATCH] Edit results
  total: 5
  successful: 3
  failed: 2
  partialSuccess: true

[PATCH] Using partial success - some edits applied
  appliedEdits: 3
  failedEdits: 2
  modifiedFileCount: 1
```

### Failed Edit Details

```javascript
[PATCH] Edit #3 failed for /main.ts
  errorData:
    error: "Search string not found in file"
    searchStringLength: 702
    searchStringPreview: "function withAlpha..."
    fileContentLength: 15480
    fileContentPreview: "import { createSandbox..."

[PATCH] Similarity analysis
  matchPercentage: "85.0%"
  unmatchedWords: ["oldFunction", "removedVariable"]
```

---

## User Experience Flow

### Scenario: Complex Request with Some Failures

**User Request:**
```
"Refactor the entire game logic and add new features"
```

**What Happens:**

1. **Backend processes:**
   - Gemini generates 8 edits
   - 5 edits match and apply successfully
   - 3 edits fail (whitespace issues)

2. **User sees in UI:**
   - ⚠️ Warning toast: "Partial success: 5 of 8 edits applied. 3 failed."
   - Chat message shows detailed breakdown
   - Console logs show exact error details
   - UI remains responsive (no freeze)
   - Successfully applied changes are visible in preview

3. **User can:**
   - Review what worked
   - Check console for detailed error analysis
   - Try again with simpler request
   - Switch to Full File mode
   - Or accept the partial changes

**No more all-or-nothing! User gets partial progress.**

---

## Testing Scenarios

### Test 1: All Edits Succeed
```
Request: "Add a console.log to line 5"
Expected: ✅ All edits applied, success message, green toast
```

### Test 2: Some Edits Fail
```
Request: "Refactor 5 functions"
Expected: ⚠️ Partial success, warning toast, detailed breakdown
```

### Test 3: All Edits Fail
```
Request: "Change code that doesn't exist"
Expected: ❌ Error message, suggestions, no freeze
```

### Test 4: Network Error
```
Disconnect internet during request
Expected: ❌ Network error message, loading cleared, no freeze
```

---

## Configuration

### Enabling/Disabling Partial Success

Currently always enabled. To disable (not recommended):

```typescript
// In backend/src/routes/ai-stream.ts
if (patchResult.success === false) {
  throw new Error(...); // Fail on any error
}
```

### Adjusting Error Thresholds

```typescript
// Allow up to 30% failures
const failureRate = failedEdits / normalizedEdits.length;
if (failureRate > 0.3) {
  throw new Error("Too many failures");
}
```

---

## Benefits

### Before These Changes
- ❌ UI could freeze on errors
- ❌ Complex requests often completely failed
- ❌ Poor error messages
- ❌ No partial progress
- ❌ Hard to debug issues

### After These Changes
- ✅ UI never freezes
- ✅ Partial success for complex requests
- ✅ Clear, actionable error messages
- ✅ Users get some progress even if not everything works
- ✅ Detailed debugging info in console

---

## Related Files

- `backend/src/routes/ai-stream.ts` - Backend error handling
- `frontend/src/hooks/useAIChat.ts` - Frontend error handling
- `docs/gemini-integration.md` - Full Gemini documentation
- `docs/gemini-quick-reference.md` - Quick reference guide

---

## Future Enhancements

1. **Retry Failed Edits**: Automatically retry failed edits with normalized whitespace
2. **Edit Preview**: Show diff preview before applying
3. **Rollback**: Undo failed edits one by one
4. **Smart Suggestions**: AI suggests fixes for failed edits
5. **Rate Limiting**: Warn users about too many requests

---

**Last Updated**: November 1, 2025  
**Status**: ✅ Implemented and Tested  
**Breaking Changes**: None

