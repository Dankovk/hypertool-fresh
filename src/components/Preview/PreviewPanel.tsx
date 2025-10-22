"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import type {
  FileSystemTree,
  WebContainer as WebContainerInstance,
  WebContainerProcess,
} from "@webcontainer/api";
import { WebContainer } from "@webcontainer/api";
import { IconTerminal } from "@tabler/icons-react";
import { config } from "@/config";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { CssSyncManager } from "./CssSyncManager";
import { TopBar } from "../TopBar";
// We'll implement capture functionality directly

// Constants
const DEFAULT_TOP_BAR_HEIGHT = 46;

const TERMINAL_CONFIG = {
  cursorBlink: true,
  fontSize: 13,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  theme: {
    background: "#0a0a0a",
    foreground: "#d4d4d4",
    cursor: "#d4d4d4",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5",
    brightBlack: "#666666",
    brightRed: "#f14c4c",
    brightGreen: "#23d18b",
    brightYellow: "#f5f543",
    brightBlue: "#3b8eea",
    brightMagenta: "#d670d6",
    brightCyan: "#29b8db",
    brightWhite: "#e5e5e5",
  },
} as const;

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

  // Terminal refs
  const terminalRef = useRef<Terminal | null>(null);
  const terminalElRef = useRef<HTMLDivElement | null>(null);
  const shellProcessRef = useRef<WebContainerProcess | null>(null);

  // CSS sync refs
  const cssSyncManagerRef = useRef<CssSyncManager | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Capture refs
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const recordingRef = useRef<{ isRecording: boolean } | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const topBarRef = useRef<HTMLDivElement | null>(null);

  const [terminalExpanded, setTerminalExpanded] = useState(false);
  const [status, setStatus] = useState<string>("Booting preview runtime…");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [containerReady, setContainerReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [iframeWidth, setIframeWidth] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(0);
  const [wrapperHeight, setWrapperHeight] = useState(0);
  const [maxWidth, setMaxWidth] = useState(2000);
  const [maxHeight, setMaxHeight] = useState(2000);
  const [isFittedToScreen, setIsFittedToScreen] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(DEFAULT_TOP_BAR_HEIGHT);

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

  const measureTopBarHeight = useCallback(() => {
    if (topBarRef.current) {
      const height = topBarRef.current.getBoundingClientRect().height;
      setTopBarHeight(Math.round(height));
    }
  }, []);

  // Unified function to calculate available space after top bar
  const calculateAvailableSpace = useCallback(() => {
    if (!previewContainerRef.current) return null;
    
    const container = previewContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    return {
      width: Math.round(containerRect.width),
      height: Math.round(containerRect.height - topBarHeight)
    };
  }, [topBarHeight]);

  // Unified function to update iframe size and wrapper
  const updateIframeSize = useCallback((width: number, height: number, fitted = false) => {
    setIframeWidth(width);
    setIframeHeight(height);
    setWrapperHeight(height);
    setMaxWidth(width);
    setMaxHeight(height);
    if (fitted) {
      setIsFittedToScreen(true);
    }
  }, []);

  const pipeProcessOutput = useCallback(
    (stream: ReadableStream<string> | undefined, prefix: string) => {
      if (!stream) return;
      const reader = stream.getReader();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (!value || !value.trim().length) continue;

            // Write to terminal if available
            if (terminalRef.current) {
              // Add prefix in terminal for clarity
              const prefixedValue = prefix ? `\x1b[36m[${prefix}]\x1b[0m ${value}` : value;
              terminalRef.current.write(prefixedValue);
            }

            // Also keep logs
            value.split(/\r?\n/).forEach((line) => {
              if (line.trim().length === 0) return;
              appendLog(prefix ? `[${prefix}] ${line}` : line);
            });
          }
        } catch (err) {
          // Stream closed or error
        }
      };

      pump().catch(() => {
        /* no-op */
      });
    },
    [appendLog],
  );

  const runInstall = useCallback(
    async (container: WebContainerInstance) => {
      setStatus("Installing dependencies…");
      appendLog("Installing dependencies…");

      if (terminalRef.current) {
        terminalRef.current.writeln("\x1b[1;33m>>> Running: " + config.preview.installCommand.join(" ") + "\x1b[0m");
      }

      const [command, ...args] = config.preview.installCommand;
      const installProcess = await container.spawn(command, args);
      pipeProcessOutput(installProcess.output, "npm");
      const exitCode = await installProcess.exit;
      if (exitCode !== 0) {
        throw new Error(`npm install failed (exit code ${exitCode})`);
      }
      appendLog("Dependencies installed.");

      if (terminalRef.current) {
        terminalRef.current.writeln("\x1b[1;32m✓ Dependencies installed\x1b[0m");
      }
    },
    [appendLog, pipeProcessOutput],
  );

  const startDevServer = useCallback(
    async (container: WebContainerInstance) => {
      setStatus("Starting dev server…");
      appendLog("Starting Vite dev server…");

      if (terminalRef.current) {
        terminalRef.current.writeln("\x1b[1;33m>>> Running: " + config.preview.devCommand.join(" ") + "\x1b[0m");
      }

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
      cssSyncManagerRef.current?.stop();
      // Note: recording cleanup is handled by iframe message responses
    };
  }, []);

  // Initialize CSS sync when preview is ready
  useEffect(() => {
    if (!previewUrl || !iframeRef.current) {
      return;
    }

    const handleIframeLoad = () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) {
        console.warn('[PreviewPanel] Iframe window not accessible for CSS sync');
        return;
      }

      // Initialize CSS sync manager if not already done
      if (!cssSyncManagerRef.current) {
        cssSyncManagerRef.current = new CssSyncManager(document);
      }

      // Start syncing CSS to the iframe
      const iframeWindow = iframe.contentWindow;
      const targetOrigin = new URL(previewUrl).origin;
      cssSyncManagerRef.current.start(iframeWindow, targetOrigin);
      console.log('[PreviewPanel] CSS sync started for iframe:', targetOrigin);
    };

    const iframe = iframeRef.current;
    if (iframe) {
      // If iframe is already loaded, start immediately
      if (iframe.contentWindow) {
        handleIframeLoad();
      }
      // Also listen for load event in case it hasn't loaded yet
      iframe.addEventListener('load', handleIframeLoad);
    }

    return () => {
      if (iframe) {
        iframe.removeEventListener('load', handleIframeLoad);
      }
    };
  }, [previewUrl]);

  // Unified function to handle file downloads
  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const { type, data } = event.data;
      console.log('Received message from iframe:', type, data);
      
      switch (type) {
        case 'HYPERTOOL_CAPTURE_RESPONSE':
          if (data?.blob) {
            downloadFile(data.blob, data.filename || 'hypertool-capture.png');
          }
          break;
        case 'HYPERTOOL_RECORDING_RESPONSE':
          if (data?.blob) {
            downloadFile(data.blob, data.filename || 'hypertool-recording.webm');
          }
          // Reset recording state
          recordingRef.current = null;
          setIsRecording(false);
          break;
        case 'HYPERTOOL_RECORDING_STOPPED':
          // Recording was stopped but no video was generated (e.g., too short)
          recordingRef.current = null;
          setIsRecording(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [downloadFile]);

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

    // Prevent multiple boots - check if already booting or booted
    if (containerRef.current) {
      console.log("WebContainer already booted, skipping");
      return;
    }

    let cancelled = false;
    let bootedInstance: WebContainerInstance | null = null;

    const boot = async () => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      try {
        setStatus("Booting preview runtime…");
        appendLog("Booting WebContainer runtime…");
        console.log('Booting WebContainer')

        timeout = setTimeout(() => {
          if (!isMountedRef.current) return;
          setError(
            "Timed out while booting the WebContainer runtime. Make sure stackblitz.com is reachable and try reloading.",
          );
          setStatus("Preview error");
          appendLog("WebContainer boot timed out (20s).");
          console.log("WebContainer boot timed out (20s).")
        }, 20000);

        const instance = await WebContainer.boot();
        bootedInstance = instance;

        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

        if (cancelled || !isMountedRef.current) {
          console.log("Boot cancelled, tearing down");
          await instance.teardown();
          bootedInstance = null;
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

    boot();

    return () => {
      cancelled = true;
      // Cleanup the booted instance if boot effect is cancelled
      if (bootedInstance && bootedInstance !== containerRef.current) {
        console.log("Cleaning up boot effect instance");
        try {
          bootedInstance.teardown();
        } catch (err) {
          console.error("Error during teardown:", err);
        }
      }
    };
  }, [appendLog]);

  // Handler methods for TopBar buttons
  const handleCapturePNG = useCallback(async () => {
    if (!iframeRef.current?.contentWindow) {
      console.warn('No iframe content window available for capture');
      return;
    }

    try {
      // Send message to iframe to trigger capture
      iframeRef.current.contentWindow.postMessage({
        type: 'HYPERTOOL_CAPTURE_PNG',
        source: 'hypertool-main'
      }, '*');
    } catch (error) {
      console.error('Failed to capture PNG:', error);
    }
  }, []);

  const handleRecordVideo = useCallback(async () => {
    if (!iframeRef.current?.contentWindow) {
      console.warn('No iframe content window available for recording');
      return;
    }

    try {
      if (recordingRef.current) {
        // Stop recording - don't update state here, wait for iframe response
        console.log('Sending stop recording message to iframe');
        iframeRef.current.contentWindow.postMessage({
          type: 'HYPERTOOL_STOP_RECORDING',
          source: 'hypertool-main'
        }, '*');
        return;
      }

      // Send message to iframe to start recording
      console.log('Sending start recording message to iframe');
      iframeRef.current.contentWindow.postMessage({
        type: 'HYPERTOOL_START_RECORDING',
        source: 'hypertool-main'
      }, '*');
      recordingRef.current = { isRecording: true }; // Set a marker that we're recording
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to record video:', error);
    }
  }, []);

  const calculateWrapperHeight = useCallback(() => {
    const space = calculateAvailableSpace();
    if (space) {
      setWrapperHeight(space.height);
      setMaxWidth(space.width);
      setMaxHeight(space.height);
    }
  }, [calculateAvailableSpace]);

  const handleFitScreen = useCallback(() => {
    const space = calculateAvailableSpace();
    if (space) {
      updateIframeSize(space.width, space.height, true);
    }
  }, [calculateAvailableSpace, updateIframeSize]);

  const handleWidthChange = useCallback((width: number) => {
    setIframeWidth(width);
    setIsFittedToScreen(false);
  }, []);

  const handleHeightChange = useCallback((height: number) => {
    setIframeHeight(height);
    setIsFittedToScreen(false);
  }, []);

  // Measure top bar height when component mounts
  useEffect(() => {
    measureTopBarHeight();
  }, [measureTopBarHeight]);

  // Initialize iframe size to fit wrapper by default
  useEffect(() => {
    if (!containerReady) return;
    
    const space = calculateAvailableSpace();
    if (space) {
      updateIframeSize(space.width, space.height, true);
    }
  }, [containerReady, calculateAvailableSpace, updateIframeSize]);

  // Unified resize observer for both top bar and container
  useEffect(() => {
    const observers: ResizeObserver[] = [];

    // Monitor top bar height changes
    if (topBarRef.current) {
      const topBarObserver = new ResizeObserver(() => {
        measureTopBarHeight();
      });
      topBarObserver.observe(topBarRef.current);
      observers.push(topBarObserver);
    }

    // Monitor container resize
    if (previewContainerRef.current) {
      const containerObserver = new ResizeObserver(() => {
        if (isFittedToScreen) {
          // If fitted, update both wrapper and iframe to new size
          const space = calculateAvailableSpace();
          if (space) {
            updateIframeSize(space.width, space.height, true);
          }
        } else {
          // If not fitted, only update wrapper height
          calculateWrapperHeight();
        }
      });
      containerObserver.observe(previewContainerRef.current);
      observers.push(containerObserver);
    }

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [measureTopBarHeight, calculateAvailableSpace, updateIframeSize, calculateWrapperHeight, isFittedToScreen]);

  // Initialize terminal when container is ready
  useEffect(() => {
    if (!containerReady || !containerRef.current || !terminalElRef.current) {
      console.log("[Terminal] Not ready:", { containerReady, hasContainer: !!containerRef.current, hasTerminalEl: !!terminalElRef.current });
      return;
    }

    // Check if terminal already initialized
    if (terminalRef.current) {
      console.log("[Terminal] Already initialized");
      return;
    }

    const container = containerRef.current;
    console.log("[Terminal] Initializing terminal...");

    // Initialize terminal
    const term = new Terminal(TERMINAL_CONFIG);

    terminalRef.current = term;
    term.open(terminalElRef.current);
    console.log("[Terminal] Terminal opened in DOM");

    // Write welcome message
    term.writeln("\x1b[1;32m╔═════════════════════════════════════════════╗\x1b[0m");
    term.writeln("\x1b[1;32m║      WebContainer Terminal Ready            ║\x1b[0m");
    term.writeln("\x1b[1;32m║  Type commands or view build output here    ║\x1b[0m");
    term.writeln("\x1b[1;32m╚═════════════════════════════════════════════╝\x1b[0m");
    term.writeln("");

    let resizeObserver: ResizeObserver | null = null;

    // Spawn shell process
    const startShell = async () => {
      try {
        console.log("[Terminal] Starting shell...");
        const shellProcess = await container.spawn("jsh", {
          terminal: {
            cols: term.cols,
            rows: term.rows,
          },
        });

        console.log("[Terminal] Shell started");
        shellProcessRef.current = shellProcess;

        // Pipe shell output to terminal
        const output = shellProcess.output;
        const reader = output.getReader();

        const pumpOutput = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              term.write(value);
            }
          } catch (err) {
            console.error("[Terminal] Output stream error:", err);
          }
        };

        pumpOutput().catch((err) => {
          console.error("[Terminal] Failed to pump output:", err);
        });

        // Handle terminal input
        term.onData((data) => {
          if (shellProcessRef.current) {
            const input = shellProcessRef.current.input;
            const writer = input.getWriter();
            writer.write(data).catch((err) => {
              console.error("[Terminal] Failed to write input:", err);
            });
            writer.releaseLock();
          }
        });

        // Handle terminal resize
        resizeObserver = new ResizeObserver(() => {
          if (terminalElRef.current) {
            const { clientWidth, clientHeight } = terminalElRef.current;
            const cols = Math.max(20, Math.floor(clientWidth / 9)); // Approximate char width
            const rows = Math.max(10, Math.floor(clientHeight / 17)); // Approximate line height
            term.resize(cols, rows);
          }
        });

        if (terminalElRef.current) {
          resizeObserver.observe(terminalElRef.current);
        }

        // Handle shell exit
        shellProcess.exit.then((code) => {
          console.log("[Terminal] Shell exited with code", code);
          term.writeln(`\r\n\x1b[1;31mShell exited with code ${code}\x1b[0m`);
          shellProcessRef.current = null;
        });
      } catch (err: any) {
        console.error("[Terminal] Failed to start shell:", err);
        term.writeln(`\r\n\x1b[1;31mFailed to start shell: ${err?.message}\x1b[0m`);
      }
    };

    startShell();

    return () => {
      console.log("[Terminal] Cleaning up terminal...");
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      shellProcessRef.current?.kill();
      shellProcessRef.current = null;
      term.dispose();
      terminalRef.current = null;
    };
  }, [containerReady]);

  useEffect(() => {
    if (!containerReady || !containerRef.current) {
      return;
    }
    // Don't sync if files are empty (waiting for initial load)
    const hasFiles = Object.keys(files).length > 0;
    const hasPackageJson = files["/package.json"] || files["package.json"];
    if (!hasFiles || !hasPackageJson) {
      setStatus("Waiting for project files...");
      return;
    }

    console.log("[PreviewPanel] Files prop changed, syncing to WebContainer");
    queueSync(files, { forceInstall: lastPackageJsonRef.current === null });
  }, [containerReady, files, queueSync]);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
      {/* <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
        <div className="text-lg font-semibold tracking-tight text-accent">Live Preview</div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">{status}</span>
        </div>
      </div> */}
      <div ref={previewContainerRef} className="relative bg-black h-full">
        <div ref={topBarRef}>
          <TopBar 
            onDownload={onDownload} 
            onCapturePNG={handleCapturePNG}
            onRecordVideo={handleRecordVideo}
            isRecording={isRecording}
            width={iframeWidth}
            height={iframeHeight}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            onWidthChange={handleWidthChange}
            onHeightChange={handleHeightChange}
            onFitScreen={handleFitScreen}
          />
        </div>
        {previewUrl ? (
          <div 
            className="hyper-frame-external-wrapper flex w-full items-center justify-center"
            style={{ height: `${wrapperHeight}px` }}
          >
            <iframe
              ref={iframeRef}
              key={previewUrl}
              src={previewUrl}
              title="Preview"
              // sandbox="allow-forms allow-downloads allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
              className="border-0"
              style={{
                width: `${iframeWidth}px`,
                height: `${iframeHeight}px`,
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          </div>
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

        {/* Floating Terminal Panel */}
        {terminalExpanded && (
          <div
            className="absolute left-0 right-0 bottom-0 border-t border-border"
            style={{
              height: "350px",
              transition: "height 0.2s ease-in-out",
            }}
          >
            <button
              className="flex w-full items-center justify-between px-5 py-3 text-sm text-text bg-background hover:bg-muted/95 transition cursor-pointer"
              onClick={() => setTerminalExpanded(false)}
            >
              <div className="flex items-center gap-2">
                <IconTerminal size={16} />
                <span className="font-medium">Terminal</span>
              </div>
              <span className="text-xs text-text-secondary">▼</span>
            </button>
            <div
              ref={terminalElRef}
              className="w-full"
              style={{
                backgroundColor: TERMINAL_CONFIG.theme.background,
                height: "calc(100% - 49px)",
                overflow: "hidden",
              }}
            />
          </div>
        )}

        {/* Terminal Toggle Button - only show when terminal is hidden */}
        {!terminalExpanded && (
          <button
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text hover:bg-muted/95 transition"
            onClick={() => setTerminalExpanded(true)}
          >
            <IconTerminal size={16} />
            <span>Terminal</span>
          </button>
        )}
      </div>
    </div>
  );
});

PreviewPanel.displayName = "PreviewPanel";
