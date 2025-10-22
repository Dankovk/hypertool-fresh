import { existsSync, watch } from "node:fs";
import { resolve, join } from "node:path";
import { createLogger } from "@/lib/logger";

const encoder = new TextEncoder();

function toSSE(data: string, event?: string) {
  if (event) {
    return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
  }
  return encoder.encode(`data: ${data}\n\n`);
}

export function GET() {
  const requestId = `watch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/runtime-watch', requestId);

  logger.info('Runtime watch SSE connection requested');

  if (process.env.NODE_ENV === "production") {
    logger.warn('Runtime watch requested in production mode, denying');
    return new Response("Runtime watch is only available in development.", { status: 404 });
  }

  const runtimeRoot = resolve(process.cwd(), "hyper-runtime");
  const distRoot = join(runtimeRoot, "dist");
  const watchTargets = [
    runtimeRoot,
    distRoot,
    join(distRoot, "controls"),
    join(distRoot, "frame"),
  ];

  logger.debug('Setting up file watchers', {
    runtimeRoot,
    distRoot,
    watchTargets,
  });

  const watchers: ReturnType<typeof watch>[] = [];
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      logger.info('SSE stream started, setting up watchers');
      controller.enqueue(toSSE(JSON.stringify({ ready: true }), "ready"));

      let activeWatchersCount = 0;

      for (const target of watchTargets) {
        if (!existsSync(target)) {
          logger.warn('Watch target does not exist', { target });
          continue;
        }

        const watcher = watch(target, (eventType, filename) => {
          logger.debug('File change detected', {
            eventType,
            filename,
            target,
          });

          const payload = {
            event: eventType,
            file: filename ?? null,
            target,
            timestamp: Date.now(),
          };
          controller.enqueue(toSSE(JSON.stringify(payload)));
        });

        watchers.push(watcher);
        activeWatchersCount++;
      }

      logger.info('File watchers initialized', {
        totalTargets: watchTargets.length,
        activeWatchers: activeWatchersCount,
      });

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);

      logger.debug('Keep-alive interval started');
    },
    cancel() {
      logger.info('SSE stream cancelled, cleaning up watchers');

      for (const watcher of watchers) {
        watcher.close();
      }

      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }

      logger.info('Watchers and keep-alive cleaned up', {
        closedWatchers: watchers.length,
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
