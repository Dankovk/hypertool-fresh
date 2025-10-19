import { useCallback } from "react";
import { useVersionsStore } from "@/stores";
import type { FileMap } from "@/types/studio";

/**
 * Hook for managing code version history using Zustand store.
 */
export function useCodeVersions() {
  const codeVersions = useVersionsStore((state) => state.versions);
  const addVersion = useVersionsStore((state) => state.addVersion);
  const clearVersions = useVersionsStore((state) => state.clearVersions);

  const saveVersion = useCallback(
    (files: FileMap, prompt: string, model: string) => {
      addVersion(files, prompt, model);
    },
    [addVersion]
  );

  return {
    codeVersions,
    saveVersion,
    clearVersions,
  };
}
