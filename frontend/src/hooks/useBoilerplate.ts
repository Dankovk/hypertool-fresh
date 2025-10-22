import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useBoilerplateStore } from "@/stores";
import { FileMapSchema } from "@/types/studio";
import { toClientFiles } from "@/lib/fileUtils";
import { apiFetch, API_ENDPOINTS } from "@/lib/api-client";
import type { FileMap } from "@/types/studio";

/**
 * Hook for managing boilerplate presets using Zustand store.
 */
export function useBoilerplate() {
  const presets = useBoilerplateStore((state) => state.presets);
  const setPresets = useBoilerplateStore((state) => state.setPresets);

  const loadBoilerplate = useCallback(async (presetId?: string): Promise<FileMap | null> => {
    const url = presetId
      ? `${API_ENDPOINTS.BOILERPLATE}?preset=${presetId}`
      : `${API_ENDPOINTS.BOILERPLATE}?preset=circle`;
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
  }, []);

  const loadPresets = useCallback(async () => {
    const res = await apiFetch(`${API_ENDPOINTS.BOILERPLATE}?action=list`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.presets) {
      setPresets(json.presets);
    }
  }, [setPresets]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  return {
    presets,
    loadBoilerplate,
    loadPresets,
  };
}
