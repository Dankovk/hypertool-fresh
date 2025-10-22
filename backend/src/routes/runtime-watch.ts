import { Hono } from 'hono';
import { existsSync, watch } from 'node:fs';
import { resolve, join } from 'node:path';
import { stream } from 'hono/streaming';

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
    const runtimeRoot = resolve(process.cwd(), '../hyper-runtime');
    const distRoot = join(runtimeRoot, 'dist');
    const watchTargets = [
      runtimeRoot,
      distRoot,
      join(distRoot, 'controls'),
      join(distRoot, 'frame'),
    ];

    const watchers: ReturnType<typeof watch>[] = [];
    let keepAlive: ReturnType<typeof setInterval> | null = null;

    try {
      // Set SSE headers
      c.header('Content-Type', 'text/event-stream');
      c.header('Cache-Control', 'no-cache, no-transform');
      c.header('Connection', 'keep-alive');

      // Send ready event
      await stream.write(toSSE(JSON.stringify({ ready: true }), 'ready'));

      // Set up file watchers
      for (const target of watchTargets) {
        if (!existsSync(target)) {
          continue;
        }

        const watcher = watch(target, async (eventType, filename) => {
          const payload = {
            event: eventType,
            file: filename ?? null,
            target,
            timestamp: Date.now(),
          };
          await stream.write(toSSE(JSON.stringify(payload)));
        });

        watchers.push(watcher);
      }

      // Keep-alive ping
      keepAlive = setInterval(async () => {
        await stream.write(encoder.encode(': keep-alive\n\n'));
      }, 15000);

      // Wait for connection to close
      await stream.sleep(Number.MAX_SAFE_INTEGER);
    } finally {
      // Cleanup
      for (const watcher of watchers) {
        watcher.close();
      }
      if (keepAlive) {
        clearInterval(keepAlive);
      }
    }
  });
});

export default app;
