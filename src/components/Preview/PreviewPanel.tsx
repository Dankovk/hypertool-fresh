"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import type {
  FileSystemTree,
  WebContainer as WebContainerInstance,
  WebContainerProcess,
} from "@webcontainer/api";
import { WebContainer } from "@webcontainer/api";
import { IconDownload } from "@tabler/icons-react";
import { config } from "@/config";

interface PreviewPanelProps {
  files: Record<string, string>;
  onDownload: () => void;
}

type LogEntry = {
  id: string;
  message: string;
};

function toFileSystemTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [rawPath, contents] of Object.entries(files)) {
    const cleanPath = rawPath.replace(/^\/+/, "");
    if (!cleanPath) continue;

    const segments = cleanPath.split("/");
    let cursor: FileSystemTree = tree;

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;
      if (isFile) {
        cursor[segment] = { file: { contents } };
        return;
      }

      if (!cursor[segment]) {
        cursor[segment] = { directory: {} };
      }
      cursor = (cursor[segment] as { directory: FileSystemTree }).directory;
    });
  }

  return tree;
}

function getPackageJson(files: Record<string, string>): string {
  return files["/package.json"] ?? files["package.json"] ?? "";
}

export const PreviewPanel = memo(({ files, onDownload }: PreviewPanelProps)=> {
  const isMountedRef = useRef(true);
  const containerRef = useRef<WebContainerInstance | null>(null);
  const devServerRef = useRef<WebContainerProcess | null>(null);
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastPackageJsonRef = useRef<string | null>(null);

  const [status, setStatus] = useState<string>("Booting preview runtime…");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [containerReady, setContainerReady] = useState(false);

  const appendLog = useCallback((message: string) => {
    if (!isMountedRef.current) {
      return;
    }
    setLogs((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), message }];
      if (next.length > config.preview.maxLogEntries) {
        return next.slice(next.length - config.preview.maxLogEntries);
      }
      return next;
    });
  }, []);

  const pipeProcessOutput = useCallback(
    (stream: ReadableStream<string> | undefined, prefix: string) => {
      if (!stream) return;
      stream
        .pipeTo(
          new WritableStream<string>({
            write(chunk) {
              if (!chunk.trim().length) return;
              chunk.split(/\r?\n/).forEach((line) => {
                if (line.trim().length === 0) return;
                appendLog(prefix ? `[${prefix}] ${line}` : line);
              });
            },
          }),
        )
        .catch(() => {
          /* no-op */
        });
    },
    [appendLog],
  );

  const runInstall = useCallback(
    async (container: WebContainerInstance) => {
      setStatus("Installing dependencies…");
      appendLog("Installing dependencies…");

      const [command, ...args] = config.preview.installCommand;
      const installProcess = await container.spawn(command, args);
      pipeProcessOutput(installProcess.output, "npm");
      const exitCode = await installProcess.exit;
      if (exitCode !== 0) {
        throw new Error(`npm install failed (exit code ${exitCode})`);
      }
      appendLog("Dependencies installed.");
    },
    [appendLog, pipeProcessOutput],
  );

  const startDevServer = useCallback(
    async (container: WebContainerInstance) => {
      setStatus("Starting dev server…");
      appendLog("Starting Vite dev server…");
      const [command, ...args] = config.preview.devCommand;
      const process = await container.spawn(command, args);
      devServerRef.current = process;
      pipeProcessOutput(process.output, "dev");
      process.exit.then((code) => {
        if (!isMountedRef.current) return;
        devServerRef.current = null;
        if (code !== 0) {
          setError(`Dev server exited unexpectedly (code ${code})`);
          setStatus("Preview stopped");
        }
      });
    },
    [appendLog, pipeProcessOutput],
  );

  const queueSync = useCallback(
    (nextFiles: Record<string, string>, options?: { forceInstall?: boolean }) => {
      const container = containerRef.current;
      if (!container) return;

      const tree = toFileSystemTree(nextFiles);
      const packageJson = getPackageJson(nextFiles);
      const shouldInstall =
        options?.forceInstall || lastPackageJsonRef.current !== packageJson;

      syncQueueRef.current = syncQueueRef.current
        .then(async () => {
          if (!isMountedRef.current) {
            return;
          }

          setError(null);
          setStatus("Synchronizing project…");
          await container.mount(tree);

          if (shouldInstall) {
            if (devServerRef.current) {
              devServerRef.current.kill();
              devServerRef.current = null;
            }
            lastPackageJsonRef.current = packageJson;
            await runInstall(container);
          } else if (!lastPackageJsonRef.current) {
            lastPackageJsonRef.current = packageJson;
          }

          if (!devServerRef.current) {
            await startDevServer(container);
          } else {
            setStatus("Preview ready");
          }
        })
        .catch((err: any) => {
          if (!isMountedRef.current) return;
          console.error("[Preview] Sync failed", err);
          setError(err?.message ?? "Preview sync failed");
          setStatus("Preview error");
        });
    },
    [runInstall, startDevServer],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      devServerRef.current?.kill();
      containerRef.current?.teardown();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!(window as any).crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
      setError(
        "WebContainers require cross-origin isolated contexts. Please ensure the app is served over HTTPS (or localhost) with proper COOP/COEP headers.",
      );
      setStatus("Preview unavailable");
      return;
    }

    let cancelled = false;

    const boot = async () => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      try {
        setStatus("Booting preview runtime…");
        appendLog("Booting WebContainer runtime…");
        console.log('Booting')

        timeout = setTimeout(() => {
          if (!isMountedRef.current) return;
          setError(
            "Timed out while booting the WebContainer runtime. Make sure stackblitz.com is reachable and try reloading.",
          );
          setStatus("Preview error");
          appendLog("WebContainer boot timed out (20s).");
            console.log('"WebContainer boot timed out (20s).')
        }, 20000);

        const instance = await WebContainer.boot({

        });

        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

        if (cancelled || !isMountedRef.current) {
          await instance.teardown();
          return;
        }

        containerRef.current = instance;
        appendLog("WebContainer runtime ready.");
        instance.on("server-ready", (_port, url) => {
          if (!isMountedRef.current) return;
          setPreviewUrl(url);
          setStatus("Preview ready");
        });
        setContainerReady(true);
      } catch (err: any) {
        appendLog(`WebContainer boot failed: ${err?.message ?? err}`);
        if (!cancelled && isMountedRef.current) {
          setError(err?.message ?? "Failed to boot preview runtime");
          setStatus("Preview error");
        }
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    };

    boot().then(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerReady || !containerRef.current) {
      return;
    }
    queueSync(files, { forceInstall: lastPackageJsonRef.current === null });
  }, [containerReady, files, queueSync]);

  const logOutput = useMemo(() => logs.map((entry) => entry.message).join("\n"), [logs]);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
      <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
        <div className="text-lg font-semibold tracking-tight text-accent">Live Preview</div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">{status}</span>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-muted"
            onClick={onDownload}
          >
            <IconDownload size={18} /> Download
          </button>
        </div>
      </div>
      <div className="relative flex-1 bg-black">
        {previewUrl ? (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="Preview"
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">
            {error ? error : status}
          </div>
        )}
        {error && previewUrl && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-900/80 px-4 py-2 text-xs text-red-100">
            {error}
          </div>
        )}
      </div>
      <details className="border-t border-border bg-background/50 px-5 py-3 text-sm text-text-secondary">
        <summary className="cursor-pointer select-none text-text">Logs</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-text-secondary">
          {logOutput || "Logs will appear here."}
        </pre>
      </details>
    </div>
  );
})
