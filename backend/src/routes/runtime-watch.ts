import { Hono } from 'hono';
import { existsSync, watch } from 'node:fs';
import { resolve, join } from 'node:path';
import { stream } from 'hono/streaming';
import { loadRuntimeBundles } from '../lib/boilerplate.js';
import { HYPER_RUNTIME_DIST_FROM_BACKEND } from '@hypertool/shared-config/paths';

const app = new Hono();

const encoder = new TextEncoder();

function toSSE(data: string, event?: string) {
  if (event) {
    return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
  }
  return encoder.encode(`data: ${data}\n\n`);
}

app.get('/', (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.text('Runtime watch is only available in development.', 404);
  }

  return stream(c, async (stream) => {
    const distRoot = resolve(process.cwd(), HYPER_RUNTIME_DIST_FROM_BACKEND);
    const watchTargets = [distRoot];

    const watchers: ReturnType<typeof watch>[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Function to send bundles via SSE
    const sendBundles = async () => {
      try {
        const bundles = loadRuntimeBundles();
        const payload = {
          type: 'bundles',
          bundles,
          timestamp: Date.now(),
        };
        await stream.write(toSSE(JSON.stringify(payload), 'bundles'));
        console.log('[runtime-watch] Sent bundles via SSE:', Object.keys(bundles));
      } catch (error) {
        console.error('[runtime-watch] Error sending bundles:', error);
      }
    };

    try {
      // Set SSE headers
      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache, no-transform');
      c.header('Connection', 'keep-alive');

      // Send ready event with initial bundles
      await stream.write(toSSE(JSON.stringify({ ready: true }), 'ready'));
      await sendBundles();

      // Set up file watchers with debouncing
      for (const target of watchTargets) {
        if (!existsSync(target)) {
          continue;
        }

        const watcher = watch(target, (eventType, filename) => {
          // Ignore .d.js files
          if (filename?.endsWith('.d.js')) {
            return;
          }

          console.log(`[runtime-watch] File change detected: ${eventType} ${filename}`);

          // Debounce: wait 250ms after last change before sending
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = setTimeout(() => {
            sendBundles().catch((err) => {
              console.error('[runtime-watch] Error in sendBundles:', err);
            });
          }, 250);
        });

        watchers.push(watcher);
      }

      // Keep connection alive indefinitely
      // Send keep-alive comments every 5 seconds to prevent Bun's 10s timeout
      try {
        while (true) {
          await stream.sleep(5000); // Reduced from 15s to 5s to stay under Bun's 10s idleTimeout
          try {
            await stream.write(encoder.encode(': keep-alive\n\n'));
          } catch (writeError) {
            // Stream might be closed, break the loop
            console.log('[runtime-watch] Failed to write keep-alive, stream may be closed');
            break;
          }
        }
      } catch (error) {
        // Connection closed by client or error occurred
        console.log('[runtime-watch] Stream ended:', error);
        throw error; // Re-throw to trigger cleanup
      }
    } finally {
      // Cleanup
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      for (const watcher of watchers) {
        watcher.close();
      }
    }
  });
});

export default app;
