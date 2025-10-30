"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useVersionsStore } from "@/stores";
import { useQuery, useMutation, useConvex } from "@/lib/convex";
import { config } from "@/config";
import { getSessionId } from "@/lib/session";
import type { FileMap, CodeVersion } from "@/types/studio";

/**
 * Hook for managing code version history using Zustand store and Convex.
 * History is scoped to the current browser session.
 */
export function useCodeVersions() {
  const codeVersions = useVersionsStore((state) => state.versions);
  const setVersions = useVersionsStore((state) => state.setVersions);
  const addVersion = useVersionsStore((state) => state.addVersion);
  const clearVersions = useVersionsStore((state) => state.clearVersions);

  // Get or create session ID (memoized)
  const sessionId = useMemo(() => getSessionId(), []);

  // Load versions from Convex for this session
  const convexVersions = useQuery("codeVersions:listVersions", {
    sessionId,
    limit: config.history.maxVersions,
  });

  const createVersionMutation = useMutation("codeVersions:createVersion");
  const deleteVersionMutation = useMutation("codeVersions:deleteVersion");
  const clearVersionsMutation = useMutation("codeVersions:clearVersions");
  const convex = useConvex();

  // Sync Convex versions to Zustand store
  useEffect(() => {
    if (convexVersions) {
      // Fetch full versions with files if needed
      // For now, just sync metadata
      const versionsMetadata = convexVersions.map((v) => ({
        id: v.id,
        timestamp: v.timestamp,
        prompt: v.prompt,
        model: v.model,
        files: {}, // Will be loaded on demand
      }));
      setVersions(versionsMetadata as CodeVersion[]);
    }
  }, [convexVersions, setVersions]);

  /**
   * Load full version with files (for restoration)
   */
  const loadVersion = useCallback(
    async (versionId: string): Promise<CodeVersion | null> => {
      try {
        const version = await convex.query("codeVersions:getVersion", {
          id: versionId,
          sessionId,
        });
        if (!version) {
          return null;
        }
        return {
          id: version.id,
          timestamp: version.timestamp,
          files: version.files,
          prompt: version.prompt,
          model: version.model,
        };
      } catch (error) {
        console.error("Failed to load version:", error);
        return null;
      }
    },
    [convex, sessionId]
  );

  const saveVersion = useCallback(
    async (files: FileMap, prompt: string, model: string) => {
      const id = crypto.randomUUID();
      const timestamp = Date.now();

      // Add to local store immediately for optimistic UI
      addVersion(files, prompt, model);

      // Save to Convex with session ID
      try {
        await createVersionMutation({
          id,
          sessionId,
          timestamp,
          files,
          prompt,
          model,
        });
      } catch (error) {
        console.error("Failed to save version to Convex:", error);
        // Optionally remove from local store if Convex save fails
      }
    },
    [addVersion, createVersionMutation, sessionId]
  );

  const removeVersion = useCallback(
    async (id: string) => {
      // Remove from local store
      const removeVersionFromStore = useVersionsStore.getState().removeVersion;
      removeVersionFromStore(id);

      // Remove from Convex (with session check)
      try {
        await deleteVersionMutation({ id, sessionId });
      } catch (error) {
        console.error("Failed to delete version from Convex:", error);
      }
    },
    [deleteVersionMutation, sessionId]
  );

  const clearAllVersions = useCallback(async () => {
    // Clear local store
    clearVersions();

    // Clear Convex (only for this session)
    try {
      await clearVersionsMutation({ sessionId });
    } catch (error) {
      console.error("Failed to clear versions from Convex:", error);
    }
  }, [clearVersions, clearVersionsMutation, sessionId]);

  return {
    codeVersions,
    saveVersion,
    clearVersions: clearAllVersions,
    removeVersion,
    loadVersion,
    sessionId,
  };
}
