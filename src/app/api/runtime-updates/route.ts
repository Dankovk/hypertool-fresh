import { NextResponse } from "next/server";
import { resolve } from "node:path";
import chokidar from "chokidar";
import { loadRuntimeVirtualFiles } from "@/lib/boilerplate";

const RUNTIME_DIST_RELATIVE_PATH = "hyper-runtime/dist/index.js";

type RuntimeUpdateSubscriber = (files: Record<string, string>) => void;

let watcher: chokidar.FSWatcher | null = null;
const subscribers = new Set<RuntimeUpdateSubscriber>();

function broadcastRuntimeFiles() {
  const files = loadRuntimeVirtualFiles();
  if (!files) {
    return;
  }

  subscribers.forEach((listener) => {
    try {
      listener(files);
    } catch (error) {
      console.error("[runtime-updates] Failed to notify subscriber", error);
    }
  });
}

function ensureWatcher() {
  if (watcher) {
    return;
  }

  const targetPath = resolve(process.cwd(), RUNTIME_DIST_RELATIVE_PATH);
  watcher = chokidar.watch(targetPath, {
    ignoreInitial: true,
  });

  const handleChange = () => {
    broadcastRuntimeFiles();
  };

  watcher.on("add", handleChange);
  watcher.on("change", handleChange);
  watcher.on("error", (error) => {
    console.error("[runtime-updates] Watcher error", error);
  });
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  ensureWatcher();

  const encoder = new TextEncoder();
  let send: RuntimeUpdateSubscriber | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      send = (files) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ files })}\n\n`),
        );
      };

      subscribers.add(send);

      const initial = loadRuntimeVirtualFiles();
      if (initial) {
        send(initial);
      }

      const abort = () => {
        if (send) {
          subscribers.delete(send);
        }
        controller.close();
      };

      req.signal.addEventListener("abort", abort);

      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));
    },
    cancel() {
      if (send) {
        subscribers.delete(send);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
