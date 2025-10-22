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
import { API_ENDPOINTS, getApiUrl } from "@/lib/api-client";
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

  // Debug logging for streaming
  useEffect(() => {
    console.log("[HomePage] chat.streamingText:", chat.streamingText ? `${chat.streamingText.length} chars` : "empty");
  }, [chat.streamingText]);

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
    const res = await fetch(getApiUrl(API_ENDPOINTS.DOWNLOAD), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    console.log("[runtime-watch] useEffect running, setting up SSE connection");

    if (process.env.NODE_ENV !== "development") {
      console.log("[runtime-watch] Not in development mode, skipping");
      return;
    }

    let active = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;

    const applyBundles = (runtimeFiles: Record<string, string>) => {
      if (!runtimeFiles || !active) {
        console.log("[runtime-watch] No runtime files to apply");
        return;
      }

      console.log("[runtime-watch] Received bundles via SSE:", Object.keys(runtimeFiles));
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
    };

    const connect = () => {
      if (!active) {
        return;
      }

      if (eventSource) {
        eventSource.close();
      }

      const watchUrl = getApiUrl(API_ENDPOINTS.RUNTIME_WATCH);
      console.log("[runtime-watch] Connecting to:", watchUrl);

      const source = new EventSource(watchUrl);
      eventSource = source;

      source.addEventListener("ready", (event: any) => {
        if (!active) {
          return;
        }
        console.log("[runtime-watch] SSE connection ready");
        try {
          const data = JSON.parse(event.data);
          console.log("[runtime-watch] Ready event data:", data);
        } catch (e) {
          // Ignore parse errors
        }
      });

      source.addEventListener("bundles", (event: any) => {
        if (!active) {
          return;
        }

        try {
          const payload = JSON.parse(event.data);
          console.log("[runtime-watch] Bundles event received");
          if (payload && payload.bundles) {
            applyBundles(payload.bundles);
          }
        } catch (error) {
          console.error("[runtime-watch] Error parsing bundles event:", error);
        }
      });

      source.onerror = (error) => {
        console.error("[runtime-watch] SSE connection error:", error);
        console.log("[runtime-watch] EventSource readyState:", source.readyState);
        source.close();
        if (!active) {
          return;
        }
        console.log("[runtime-watch] Scheduling reconnect in 2 seconds...");
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        reconnectTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      console.log("[runtime-watch] useEffect cleanup, closing connection");
      active = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [setFiles]);

  return (
    <div className="grid h-screen grid-cols-studio gap-2 p-2">
      <ChatPanel
        messages={chat.messages}
        input={chat.input}
        loading={chat.loading}
        streamingText={chat.streamingText}
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
