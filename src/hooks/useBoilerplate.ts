import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileMapSchema } from "@/types/studio";
import { toClientFiles } from "@/lib/fileUtils";
import type { FileMap, PresetInfo } from "@/types/studio";

export function useBoilerplate() {
  const [presets, setPresets] = useState<PresetInfo[]>([]);

  const loadBoilerplate = useCallback(async (presetId?: string): Promise<FileMap | null> => {
    const url = presetId ? `/api/boilerplate?preset=${presetId}` : "/api/boilerplate?preset=circle";
    const res = await fetch(url);
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
    const res = await fetch("/api/boilerplate?action=list");
    if (!res.ok) return;
    const json = await res.json();
    if (json.presets) {
      setPresets(json.presets);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  return {
    presets,
    loadBoilerplate,
    loadPresets,
  };
}
