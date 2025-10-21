"use client";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/Chat/ChatPanel";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { PreviewPanel } from "@/components/Preview/PreviewPanel";
import { PresetsModal } from "@/components/Modals/PresetsModal";
import { VersionHistoryModal } from "@/components/Modals/VersionHistoryModal";
import { useBoilerplate } from "@/hooks/useBoilerplate";
import { useCodeVersions } from "@/hooks/useCodeVersions";
import { useAIChat } from "@/hooks/useAIChat";
import { useFilesStore, useUIStore, useVersionsStore, useChatStore } from "@/stores";
import { toRuntimeFileMap } from "@/lib/fileUtils";
import type { CodeVersion } from "@/types/studio";

export default function HomePage() {
  // Zustand stores
  const files = useFilesStore((state) => state.files);
  const setFiles = useFilesStore((state) => state.setFiles);
  const showVersionHistory = useUIStore((state) => state.showVersionHistory);
  const setShowVersionHistory = useUIStore((state) => state.setShowVersionHistory);
  const showPresets = useUIStore((state) => state.showPresets);
  const setShowPresets = useUIStore((state) => state.setShowPresets);

  // Custom hooks
  const { presets, loadBoilerplate } = useBoilerplate();
  const { codeVersions, clearVersions } = useCodeVersions();
  const chat = useAIChat();
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Load initial boilerplate (only once on mount)
  useEffect(() => {
    const loadInitial = async () => {
      const boilerplate = await loadBoilerplate();
      if (boilerplate) {
        setFiles(boilerplate);
      }
    };
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize files for runtime (leading slashes)
  // Memoize to prevent unnecessary re-renders of PreviewPanel
  const previewFiles = useMemo(() => toRuntimeFileMap(files), [files]);

  const onReset = useCallback(async () => {
    const boilerplate = await loadBoilerplate();
    if (boilerplate) {
      setFiles(boilerplate);
      clearMessages();
      clearVersions();
      toast.success("Reset to boilerplate");
    }
  }, [loadBoilerplate, setFiles, clearMessages, clearVersions]);

  const onLoadPreset = useCallback(async (presetId: string) => {
    const presetFiles = await loadBoilerplate(presetId);
    if (presetFiles) {
      setFiles(presetFiles);
      clearMessages();
      clearVersions();
      setShowPresets(false);
      toast.success("Preset loaded");
    }
  }, [loadBoilerplate, setFiles, clearMessages, clearVersions, setShowPresets]);

  const onRestoreVersion = useCallback((version: CodeVersion) => {
    setFiles(version.files);
    setShowVersionHistory(false);
    toast.success("Version restored");
  }, [setFiles, setShowVersionHistory]);

  const onDownload = useCallback(async () => {
    const res = await fetch("/api/download", {
      method: "POST",
      body: JSON.stringify({ files }),
    });
    if (!res.ok) {
      toast.error("Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let active = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let refreshTimer: number | null = null;

    const fetchBundles = async () => {
      try {
        // Add cache-busting and no-cache headers
        const response = await fetch(`/api/runtime-watch/snapshot?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
        });

        if (!response.ok) {
          return null;
        }

        const json = await response.json();
        if (!json || typeof json !== "object" || !json.bundles) {
          return null;
        }
        return json.bundles as Record<string, string>;
      } catch (error) {
        return null;
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(async () => {
        if (!active) {
          return;
        }

        console.log("[runtime-watch] Fetching fresh bundles from snapshot endpoint...");
        const runtimeFiles = await fetchBundles();
        if (!runtimeFiles || !active) {
          console.log("[runtime-watch] No runtime files received");
          return;
        }

        console.log("[runtime-watch] Received bundles:", Object.keys(runtimeFiles));
        const currentFiles = useFilesStore.getState().files;
        let changed = false;
        const nextFiles = { ...currentFiles };

        for (const [path, contents] of Object.entries(runtimeFiles)) {
          if (!path.startsWith("/__hypertool__/")) {
            continue;
          }

          const oldContent = nextFiles[path];
          if (oldContent !== contents) {
            console.log(`[runtime-watch] Bundle changed: ${path}`);
            console.log(`  Old size: ${oldContent?.length ?? 0} bytes`);
            console.log(`  New size: ${contents.length} bytes`);
            console.log(`  First 100 chars: ${contents.substring(0, 100)}`);
            nextFiles[path] = contents;
            changed = true;
          }
        }

        if (changed) {
          console.log("[runtime-watch] ✅ Updating files store with new bundles");
          setFiles(nextFiles);
        } else {
          console.log("[runtime-watch] ⚠️ No bundle changes detected (bundles are identical)");
        }
      }, 250);
    };

    const connect = () => {
      if (!active) {
        return;
      }

      if (eventSource) {
        eventSource.close();
      }

      const source = new EventSource("/api/runtime-watch");
      eventSource = source;

      source.addEventListener("ready", () => {
        if (!active) {
          return;
        }
        console.log("[runtime-watch] SSE connection ready, scheduling initial fetch");
        scheduleRefresh();
      });

      source.onmessage = (event) => {
        if (!event.data || !active) {
          return;
        }

        try {
          const payload = JSON.parse(event.data);
          console.log("[runtime-watch] SSE event received:", payload);
          if (payload && typeof payload.file === "string" && payload.file.endsWith(".d.ts")) {
            console.log("[runtime-watch] Ignoring .d.ts file change");
            return;
          }
        } catch (error) {
          // Ignore invalid payloads
        }

        console.log("[runtime-watch] File change detected, scheduling refresh");
        scheduleRefresh();
      };

      source.onerror = () => {
        source.close();
        if (!active) {
          return;
        }
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      active = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [setFiles]);

  return (
    <div className="grid h-screen grid-cols-studio gap-4 p-4">
      <ChatPanel
        messages={chat.messages}
        input={chat.input}
        loading={chat.loading}
        onInputChange={chat.setInput}
        onSubmit={chat.sendMessage}
        onReset={onReset}
        onShowHistory={() => setShowVersionHistory(true)}
        onShowPresets={() => setShowPresets(true)}
        hasVersionHistory={codeVersions.length > 0}
      />

      <PreviewPanel files={previewFiles} onDownload={onDownload} />

      <PresetsModal
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
        presets={presets}
        onSelectPreset={onLoadPreset}
      />

      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        versions={codeVersions}
        onRestoreVersion={onRestoreVersion}
      />
    </div>
  );
}
