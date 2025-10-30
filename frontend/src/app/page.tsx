"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
  const { presets, loadBoilerplate, loadBoilerplateAndSave, savedPresetId } = useBoilerplate();
  const { codeVersions, clearVersions, loadVersion } = useCodeVersions();
  const chat = useAIChat();
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Load initial boilerplate (check saved preset first, then default to universal)
  useEffect(() => {
    let mounted = true;
    let hasLoaded = false;
    
    // Timeout fallback: if savedPresetId takes too long, load default boilerplate
    const timeoutId = setTimeout(() => {
      if (!hasLoaded && mounted) {
        console.warn("[page] ⚠️ savedPresetId query timeout (3s), loading default boilerplate");
        hasLoaded = true;
        loadBoilerplate().then((boilerplate) => {
          if (boilerplate && mounted) {
            console.log("[page] ✅ Loaded default boilerplate after timeout:", Object.keys(boilerplate).length, "files");
            setFiles(boilerplate);
          }
        }).catch((err) => {
          console.error("[page] ❌ Failed to load default boilerplate after timeout:", err);
        });
      }
    }, 3000); // 3 second timeout
    
    const loadInitial = async () => {
      // Wait for savedPresetId query to complete (undefined = loading, null = loaded but no preset)
      if (savedPresetId === undefined) {
        // Still loading from Convex, wait (but timeout will kick in after 3s)
        console.log("[page] Waiting for savedPresetId to load from Convex...");
        return;
      }

      // Clear timeout since we got the result
      clearTimeout(timeoutId);

      if (!mounted || hasLoaded) {
        console.log("[page] Already loaded or unmounted, skipping");
        return;
      }
      hasLoaded = true;

      console.log("[page] Loading initial boilerplate, savedPresetId:", savedPresetId);

      // If there's a saved preset for this session, load it
      if (savedPresetId) {
        console.log("[page] Loading saved preset:", savedPresetId);
        try {
          const presetFiles = await loadBoilerplate(savedPresetId);
          if (presetFiles && mounted) {
            console.log("[page] ✅ Loaded preset files:", Object.keys(presetFiles).length, "files");
            setFiles(presetFiles);
            return;
          } else {
            console.warn("[page] Preset files were null/empty, falling back to default");
          }
        } catch (err) {
          console.error("[page] Error loading preset:", err);
          // Fall through to default
        }
      }

      // Otherwise, load default boilerplate
      if (mounted) {
        console.log("[page] Loading default boilerplate (universal)");
        try {
          const boilerplate = await loadBoilerplate();
          if (boilerplate) {
            console.log("[page] ✅ Loaded default boilerplate:", Object.keys(boilerplate).length, "files");
            setFiles(boilerplate);
          } else {
            console.error("[page] ❌ Failed to load default boilerplate (returned null)");
          }
        } catch (err) {
          console.error("[page] ❌ Failed to load default boilerplate:", err);
        }
      }
    };
    
    loadInitial();
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPresetId]);

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
    // Use loadBoilerplateAndSave to save preset selection to session
    const presetFiles = await loadBoilerplateAndSave(presetId);
    if (presetFiles) {
      setFiles(presetFiles);
      clearMessages();
      clearVersions();
      setShowPresets(false);
      toast.success("Preset loaded");
    }
  }, [loadBoilerplateAndSave, setFiles, clearMessages, clearVersions, setShowPresets]);

  const onRestoreVersion = useCallback(async (version: CodeVersion) => {
    // If version doesn't have files loaded, fetch them
    if (!version.files || Object.keys(version.files).length === 0) {
      const fullVersion = await loadVersion(version.id);
      if (fullVersion && fullVersion.files) {
        setFiles(fullVersion.files);
        setShowVersionHistory(false);
        toast.success("Version restored");
        return;
      } else {
        toast.error("Failed to load version files");
        return;
      }
    }

    setFiles(version.files);
    setShowVersionHistory(false);
    toast.success("Version restored");
  }, [setFiles, setShowVersionHistory, loadVersion]);

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

  // SSE connection for runtime bundle updates (development only)
  // Use ref to prevent double initialization in React Strict Mode
  const sseInitializedRef = useRef(false);
  
  useEffect(() => {
    // Prevent double initialization even in React Strict Mode
    if (sseInitializedRef.current) {
      console.log("[runtime-watch] SSE already initialized, skipping duplicate");
      return;
    }
    
    console.log("[runtime-watch] useEffect running, setting up SSE connection");
    sseInitializedRef.current = true;

    if (process.env.NODE_ENV !== "development") {
      console.log("[runtime-watch] Not in development mode, skipping");
      sseInitializedRef.current = false; // Reset so it can run in production if needed
      return;
    }

    let active = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

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
        // EventSource fires errors for various reasons, not all are fatal
        // readyState 0 = CONNECTING (can happen during normal operation)
        // readyState 1 = OPEN (connection is fine)
        // readyState 2 = CLOSED (connection is dead, need to reconnect)
        
        if (!active) {
          return;
        }

        // Only treat CLOSED state as an error that needs reconnection
        if (source.readyState === EventSource.CLOSED) {
          console.error("[runtime-watch] SSE connection closed:", error);
          
          // Close the connection reference
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          reconnectAttempts++;
          console.log(`[runtime-watch] Connection closed. Scheduling reconnect in 2 seconds... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error(`[runtime-watch] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping reconnection.`);
            return;
          }
          
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 2000);
        } else {
          // Connection is connecting (0) or open (1), just log for debugging
          console.log(`[runtime-watch] SSE event (readyState: ${source.readyState})`, error.type || 'unknown');
        }
      };

      source.onopen = () => {
        console.log("[runtime-watch] SSE connection opened");
        reconnectAttempts = 0; // Reset on open
      };
    };

    connect();

    return () => {
      console.log("[runtime-watch] useEffect cleanup, closing connection");
      active = false;
      sseInitializedRef.current = false; // Reset so it can reinitialize if needed
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      if (eventSource) {
        console.log("[runtime-watch] Closing EventSource connection");
        eventSource.close();
        eventSource = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

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
