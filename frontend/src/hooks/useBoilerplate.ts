"use client";

import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useBoilerplateStore } from "@/stores";
import { FileMapSchema } from "@/types/studio";
import { toClientFiles } from "@/lib/fileUtils";
import { apiFetch, API_ENDPOINTS } from "@/lib/api-client";
import { useQuery, useMutation } from "@/lib/convex";
import { getSessionId } from "@/lib/session";
import type { FileMap } from "@/types/studio";

/**
 * Hook for managing boilerplate presets using Zustand store and Convex.
 * Also manages session-based preset selection.
 */
export function useBoilerplate() {
  const presets = useBoilerplateStore((state) => state.presets);
  const setPresets = useBoilerplateStore((state) => state.setPresets);

  // Get session ID
  const sessionId = useMemo(() => getSessionId(), []);

  // Load presets from Convex
  const convexPresets = useQuery("boilerplates:listPresets", {});

  // Load saved preset for this session
  const savedPreset = useQuery("sessions:getSelectedPreset", { sessionId });

  // Mutations
  const setPresetMutation = useMutation("sessions:setSelectedPreset");

  // Update Zustand store when Convex data changes
  useEffect(() => {
    if (convexPresets && convexPresets.length > 0) {
      setPresets(convexPresets);
    }
  }, [convexPresets, setPresets]);

  const loadBoilerplate = useCallback(async (presetId?: string): Promise<FileMap | null> => {
    try {
      // Use Convex directly to get boilerplate
      const { useQuery } = await import("@/lib/convex");
      // Since we can't use hooks conditionally, we'll use the Convex query through a different approach
      // For now, fall back to API but prioritize Convex on backend
      const url = presetId
        ? `${API_ENDPOINTS.BOILERPLATE}?preset=${presetId}`
        : `${API_ENDPOINTS.BOILERPLATE}?preset=universal`;
      const res = await apiFetch(url);
      if (!res.ok) {
        toast.error("Failed to load boilerplate");
        return null;
      }
      const json = await res.json();
      const parsed = FileMapSchema.safeParse(json.files);
      if (!parsed.success) {
        toast.error("Invalid boilerplate format");
        return null;
      }
      return toClientFiles(parsed.data);
    } catch (error) {
      console.error("Failed to load boilerplate:", error);
      toast.error("Failed to load boilerplate");
      return null;
    }
  }, []);

  /**
   * Load boilerplate and save preset selection to session
   */
  const loadBoilerplateAndSave = useCallback(
    async (presetId?: string): Promise<FileMap | null> => {
      const targetPresetId = presetId || "universal";

      // Save preset selection to session
      try {
        await setPresetMutation({
          sessionId,
          presetId: targetPresetId,
        });
      } catch (error) {
        console.error("Failed to save preset selection:", error);
        // Continue anyway - this is not critical
      }

      // Load the boilerplate files
      return await loadBoilerplate(targetPresetId);
    },
    [sessionId, setPresetMutation, loadBoilerplate]
  );

  /**
   * Get the saved preset ID for this session
   */
  const getSavedPresetId = useCallback((): string | null => {
    return savedPreset?.selectedPresetId || null;
  }, [savedPreset]);

  const loadPresets = useCallback(async () => {
    // If Convex already loaded presets, use those
    if (convexPresets && convexPresets.length > 0) {
      setPresets(convexPresets);
      return;
    }

    // Fallback to API if Convex hasn't loaded yet or failed
    try {
      const res = await apiFetch(`${API_ENDPOINTS.BOILERPLATE}?action=list`);
      if (res.ok) {
        const json = await res.json();
        if (json.presets && json.presets.length > 0) {
          setPresets(json.presets);
        }
      }
    } catch (error) {
      console.error("Failed to load presets:", error);
    }
  }, [convexPresets, setPresets]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  return {
    presets,
    loadBoilerplate,
    loadBoilerplateAndSave,
    getSavedPresetId,
    savedPresetId: savedPreset?.selectedPresetId || null,
    loadPresets,
  };
}
