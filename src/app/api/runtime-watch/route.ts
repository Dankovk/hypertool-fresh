import { existsSync, watch } from "node:fs";
import { resolve, join } from "node:path";

const encoder = new TextEncoder();

function toSSE(data: string, event?: string) {
  if (event) {
    return encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
  }
  return encoder.encode(`data: ${data}\n\n`);
}

export function GET() {
  if (process.env.NODE_ENV === "production") {
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

  const watchers: ReturnType<typeof watch>[] = [];
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(toSSE(JSON.stringify({ ready: true }), "ready"));

      for (const target of watchTargets) {
        if (!existsSync(target)) {
          continue;
        }

        const watcher = watch(target, (eventType, filename) => {
          const payload = {
            event: eventType,
            file: filename ?? null,
            target,
            timestamp: Date.now(),
          };
          controller.enqueue(toSSE(JSON.stringify(payload)));
        });

        watchers.push(watcher);
      }

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);
    },
    cancel() {
      for (const watcher of watchers) {
        watcher.close();
      }
      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }
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
