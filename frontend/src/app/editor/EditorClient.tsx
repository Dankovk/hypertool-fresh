"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/Chat/ChatPanel";
import { PreviewPanel } from "@/components/Preview/PreviewPanel";
import { PresetsModal } from "@/components/Modals/PresetsModal";
import { VersionHistoryModal } from "@/components/Modals/VersionHistoryModal";
import { useBoilerplate } from "@/hooks/useBoilerplate";
import { useCodeVersions } from "@/hooks/useCodeVersions";
import { useAIChat } from "@/hooks/useAIChat";
import { useAutoSaveSessionFiles } from "@/hooks/useAutoSaveSessionFiles";
import { useFilesStore, useUIStore, useChatStore } from "@/stores";
import { toRuntimeFileMap } from "@/lib/fileUtils";
import { API_ENDPOINTS, getApiUrl } from "@/lib/api-client";
import type { CodeVersion, FileMap } from "@/types/studio";

export default function EditorClient() {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const router = useRouter();
  // Use Clerk auth directly since server-side already verified it
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isAuthenticated: convexAuthenticated, isLoading: convexLoading } = useConvexAuth();

  // Zustand stores
  const files = useFilesStore((state) => state.files);
  const setFiles = useFilesStore((state) => state.setFiles);
  const showVersionHistory = useUIStore((state) => state.showVersionHistory);
  const setShowVersionHistory = useUIStore((state) => state.setShowVersionHistory);
  const showPresets = useUIStore((state) => state.showPresets);
  const setShowPresets = useUIStore((state) => state.setShowPresets);

  // Custom hooks - MUST be called unconditionally (hooks rule)
  // These hooks handle auth failures internally
  const { presets, loadBoilerplate, loadBoilerplateAndSave, savedPresetId, savedFiles, clearSavedFiles } = useBoilerplate();
  const { codeVersions, clearVersions, loadVersion, saveVersion } = useCodeVersions();
  const chat = useAIChat({ saveVersion }); // Pass saveVersion so versions are saved with presetId
  const clearMessages = useChatStore((state) => state.clearMessages);
  
  // Auto-save file state to session when files change
  useAutoSaveSessionFiles();

  // Handle sign-out redirect using useEffect to avoid hook order issues
  useEffect(() => {
    if (clerkLoaded && !isSignedIn) {
      // User signed out - redirect immediately
      router.replace('/sign-in');
    }
  }, [clerkLoaded, isSignedIn, router]);

  // SSE connection for runtime bundle updates (development only)
  // Use ref to prevent double initialization in React Strict Mode
  const sseInitializedRef = useRef(false);
  
  // SSE useEffect - MUST be called unconditionally
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

  // Load initial boilerplate (check saved preset first, then default to universal)
  // MUST be called unconditionally (before any returns)
  useEffect(() => {
    // Only run if user is authenticated
    if (!clerkLoaded || !isSignedIn) {
      return;
    }
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
      // savedFiles will be undefined if still loading, null if loaded but no files, or a FileMap if there are saved files
      if (savedPresetId === undefined) {
        // Still loading from Convex, wait (but timeout will kick in after 3s)
        console.log("[page] Waiting for savedPresetId to load from Convex...");
        return;
      }

      // savedFiles is part of the same query as savedPresetId, so if savedPresetId is loaded, 
      // savedFiles should be too (either null or a FileMap object). If it's still undefined,
      // we should wait a bit since the query might still be resolving.
      // However, since they're from the same query, this shouldn't happen. But we handle it just in case.
      if (savedPresetId && savedFiles === undefined) {
        console.log("[page] savedPresetId loaded but savedFiles still undefined, waiting 200ms...");
        // Give it a moment - if it's still undefined after a brief delay, proceed assuming no saved files
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Clear timeout since we got the result
      clearTimeout(timeoutId);

      if (!mounted || hasLoaded) {
        console.log("[page] Already loaded or unmounted, skipping");
        return;
      }
      hasLoaded = true;

      console.log("[page] Loading initial boilerplate");
      console.log("[page]   - savedPresetId:", savedPresetId);
      console.log("[page]   - savedFiles:", savedFiles === undefined ? 'loading...' : savedFiles === null ? 'null (no saved files)' : `object with ${Object.keys(savedFiles).length} files`);
      
      if (savedFiles && typeof savedFiles === 'object') {
        console.log("[page]   - savedFiles keys:", Object.keys(savedFiles).slice(0, 10));
      }

      // If there's a saved preset for this session, check for saved file state first
      if (savedPresetId) {
        // Check if we have saved files (explicitly check for null, not undefined, since undefined means still loading)
        // Also handle case where savedFiles is an empty object {} (shouldn't happen, but be safe)
        const hasSavedFiles = savedFiles !== null && 
                              savedFiles !== undefined && 
                              typeof savedFiles === 'object' && 
                              !Array.isArray(savedFiles) &&
                              Object.keys(savedFiles).length > 0;
        
        console.log("[page]   - hasSavedFiles:", hasSavedFiles);
        
        if (hasSavedFiles) {
          console.log("[page] ✅ Restoring saved file state from session:", Object.keys(savedFiles).length, "files");
          console.log("[page] Saved file keys (first 10):", Object.keys(savedFiles).slice(0, 10));
          
          // Load the pristine boilerplate first to get runtime files, then merge saved files on top
          // This ensures runtime files are always present
          try {
            const pristineFiles = await loadBoilerplate(savedPresetId);
            if (pristineFiles && mounted) {
              // Merge: start with pristine (includes runtime), then overlay saved user files
              const mergedFiles = {
                ...pristineFiles,
                ...savedFiles,
              };
              console.log("[page] ✅ Merged saved files with runtime files. Total:", Object.keys(mergedFiles).length, "files");
              setFiles(mergedFiles);
              return;
            }
          } catch (err) {
            console.error("[page] Error loading pristine preset for merge, using saved files only:", err);
            // Fallback: use saved files directly (runtime will be injected via SSE)
            setFiles(savedFiles as FileMap);
            return;
          }
        }
        
        // No saved file state (savedFiles is null or empty)
        console.log("[page] No saved file state (savedFiles:", savedFiles === null ? "null" : savedFiles === undefined ? "undefined" : "empty", "), loading pristine preset:", savedPresetId);
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
  }, [savedPresetId, savedFiles, clerkLoaded, isSignedIn, loadBoilerplate, setFiles]);

  // ALL useMemo and useCallback hooks MUST be called before conditional returns
  // Normalize files for runtime (leading slashes)
  // Memoize to prevent unnecessary re-renders of PreviewPanel
  const previewFiles = useMemo(() => toRuntimeFileMap(files), [files]);

  const onReset = useCallback(async () => {
    // Clear saved file state when resetting
    await clearSavedFiles();
    
    const boilerplate = await loadBoilerplate();
    if (boilerplate) {
      setFiles(boilerplate);
      clearMessages();
      clearVersions();
      toast.success("Reset to boilerplate");
    }
  }, [loadBoilerplate, setFiles, clearMessages, clearVersions, clearSavedFiles]);

  const onLoadPreset = useCallback(async (presetId: string) => {
    // Check if this is the same preset as currently saved
    // If same preset and we have saved files, restore those (with runtime files)
    if (savedPresetId === presetId && savedFiles && Object.keys(savedFiles).length > 0) {
      console.log("[page] Loading same preset with saved state, restoring files");
      
      // Load pristine boilerplate to get runtime files, then merge saved files on top
      try {
        const pristineFiles = await loadBoilerplate(presetId);
        if (pristineFiles) {
          // Merge: pristine (includes runtime) + saved user files
          const mergedFiles = {
            ...pristineFiles,
            ...savedFiles,
          };
          setFiles(mergedFiles);
          clearMessages();
          setShowPresets(false);
          toast.success("Preset restored with saved state");
          return;
        }
      } catch (err) {
        console.error("[page] Error loading pristine preset for merge, using saved files only:", err);
      }
      
      // Fallback: use saved files directly (runtime will be injected via SSE in dev)
      setFiles(savedFiles as FileMap);
      clearMessages();
      setShowPresets(false);
      toast.success("Preset restored with saved state");
      return;
    }
    
    // Different preset or no saved state - load pristine preset and clear saved state
    await clearSavedFiles();
    
    // Use loadBoilerplateAndSave to save preset selection to session
    const presetFiles = await loadBoilerplateAndSave(presetId);
    if (presetFiles) {
      setFiles(presetFiles);
      clearMessages();
      clearVersions();
      setShowPresets(false);
      toast.success("Preset loaded");
    }
  }, [loadBoilerplateAndSave, setFiles, clearMessages, clearVersions, setShowPresets, savedPresetId, savedFiles, clearSavedFiles]);

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

  // NOW we can do conditional returns - ALL hooks have been called
  // Show loading while Clerk is initializing (server-side check should prevent this, but safety check)
  if (!clerkLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-text">Loading editor...</div>
        </div>
      </div>
    );
  }

  // If user is not signed in, show loading while redirect happens (useEffect handles redirect)
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-text">Redirecting...</div>
        </div>
      </div>
    );
  }

  // Show loading while Convex auth initializes, but don't block the UI forever
  // Convex auth might take a moment to fetch the token, but we can still render the editor
  const showConvexLoading = convexLoading && !convexAuthenticated;

  return (
    <>
      {/* Non-blocking loading indicator for Convex auth */}
      {showConvexLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black px-4 py-2 text-center text-sm">
          Connecting to backend...
        </div>
      )}
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
    </>
  );
}

