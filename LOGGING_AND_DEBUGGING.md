# Logging and Debugging Guide

## Overview

This project has comprehensive logging throughout the backend to help debug issues. All logs are structured and include context, request IDs, and detailed metadata.

## Log Levels

- **DEBUG**: Detailed information for debugging (only shown in development by default)
- **INFO**: General informational messages about application flow
- **WARN**: Warning messages for recoverable issues
- **ERROR**: Error messages with stack traces

## Configuration

Set the log level via environment variable:

```bash
LOG_LEVEL=DEBUG  # Options: DEBUG, INFO, WARN, ERROR
```

Default levels:
- Development: `DEBUG`
- Production: `INFO`

## Common Issues

### Patch Application Failures

#### Symptom
```
WARN [patches] Failed to apply edit
  Metadata: { filePath: '/main.ts', error: 'Search or replace string missing' }
```

#### Root Cause
The AI is generating edits with missing or empty `search` or `replace` fields.

#### Solutions

1. **Schema Validation** (Fixed in `src/types/ai.ts`)
   - The `CodeEditSchema` now enforces that `search-replace` edits must have both fields
   - The schema uses `.refine()` to validate edit types match their required fields

2. **Pre-validation** (Added in `src/lib/aiService.ts`)
   - Edits are validated before being applied
   - Invalid edits are logged with full details including the problematic data
   - The operation fails fast with a clear error message

3. **Enhanced Logging**
   - All generated edits are logged with their properties
   - Invalid edits show exactly what's missing
   - Look for logs like: `Invalid search-replace edit at index X`

#### How to Debug

When patches fail, look for these log entries in order:

1. **Raw edit details** (DEBUG level):
   ```
   Raw edit 1/6
     Metadata: {
       filePath: '/main.ts',
       type: 'search-replace',
       hasSearch: true/false,
       hasReplace: true/false,
       searchLength: 0,
       replaceLength: 0
     }
   ```

2. **Invalid edit details** (ERROR level):
   ```
   Invalid search-replace edit at index 0
     Metadata: {
       editIndex: 0,
       filePath: '/main.ts',
       fullEdit: '{...}'  // Full JSON of the invalid edit
     }
   ```

3. **Patch application failure** (WARN level):
   ```
   Invalid search-replace edit detected
     Metadata: {
       filePath: '/main.ts',
       hasSearch: false,
       searchType: 'undefined',
       fullEdit: '{...}'
     }
   ```

#### Prevention

To reduce AI-generated invalid edits:

1. **Improve system prompts** to emphasize required fields
2. **Use better examples** in prompts showing valid edit formats
3. **Switch models** if one consistently generates invalid edits
4. **Use full mode** instead of patch mode for complex changes

### Fallback Errors

#### Symptom
```
ERROR [api/ai] Fallback generation also failed
  Error: Body is unusable: Body has already been read
```

#### Root Cause (FIXED)
The error handler tried to re-read the request body, but it had already been consumed.

#### Solution
Request data is now cached at the beginning of the handler for fallback use.

## Request Tracing

Each API request gets a unique request ID:

```
INFO [api/ai]{ai-1761156928234-jiva7lt} AI request received
INFO [api/ai]{ai-1761156928234-jiva7lt} Request validated
```

The `{ai-1761156928234-jiva7lt}` is the request ID - use it to trace all logs related to a specific request.

## Performance Monitoring

The logger includes timing capabilities:

```typescript
const endTimer = logger.time('AI request processing');
// ... do work ...
endTimer(); // Logs: "AI request processing completed" with duration
```

Look for logs like:
```
INFO [api/ai] AI request processing completed
  Metadata: { durationMs: 2341 }
```

## Log Output Formats

### Development
Human-readable with colors:
```
10:23:45 INFO  [api/ai]{ai-1234567} AI request received
10:23:45 DEBUG [api/ai]{ai-1234567} Request parameters
  Metadata: { model: 'gpt-4', editMode: 'patch' }
```

### Production
Structured JSON for log aggregation:
```json
{"timestamp":"2025-10-22T10:23:45.123Z","level":"INFO","context":"api/ai","requestId":"ai-1234567","message":"AI request received"}
{"timestamp":"2025-10-22T10:23:45.456Z","level":"DEBUG","context":"api/ai","requestId":"ai-1234567","message":"Request parameters","metadata":{"model":"gpt-4","editMode":"patch"}}
```

## Viewing Logs

### During Development
Logs appear in your terminal where you run `npm run dev`.

### Filter by Component
Use the context prefix to filter:
- `[api/ai]` - AI generation endpoint
- `[api/history]` - History management
- `[aiService]` - AI service layer
- `[patches]` - Patch application
- `[boilerplate]` - File loading

### Filter by Request
Use the request ID: `{ai-1234567}`

### Filter by Level
```bash
# Only errors
npm run dev 2>&1 | grep ERROR

# Errors and warnings
npm run dev 2>&1 | grep -E "(ERROR|WARN)"
```

## Adding Logging to New Code

```typescript
import { createLogger } from '@/lib/logger';

// Create a logger with context
const logger = createLogger('my-module');

// Basic logging
logger.info('Operation started');
logger.debug('Processing data', { count: 42 });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Operation failed', error, { userId: '123' });

// Performance timing
const endTimer = logger.time('Database query');
// ... do work ...
endTimer();

// Request-specific logger
const requestLogger = logger.withRequestId('req-abc123');
```

## Troubleshooting Tips

1. **Set DEBUG level** to see all details:
   ```bash
   LOG_LEVEL=DEBUG npm run dev
   ```

2. **Look for the request ID** when debugging a specific issue

3. **Check error logs first**, then work backwards through INFO/DEBUG logs

4. **Search for "Failed"** or "Error"** in logs to quickly find issues

5. **Look at metadata** - it contains the most relevant debugging information

6. **Check timing logs** to identify performance bottlenecks

## Production Monitoring

In production, pipe logs to a log aggregation service:

- Use the structured JSON format
- Filter by `level: "ERROR"` for alerts
- Group by `context` to identify problematic components
- Track `requestId` to trace user issues
- Monitor `durationMs` in timing logs for performance
