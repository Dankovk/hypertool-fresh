import { useCallback, useState } from "react";
import { config } from "@/config";
import type { CodeVersion, FileMap } from "@/types/studio";

export function useCodeVersions() {
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([]);

  const saveVersion = useCallback((
    files: FileMap,
    prompt: string,
    model: string
  ) => {
    const version: CodeVersion = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      files,
      prompt,
      model,
    };
    setCodeVersions(prev => [version, ...prev].slice(0, config.history.maxVersions));
  }, []);

  const clearVersions = useCallback(() => {
    setCodeVersions([]);
  }, []);

  return {
    codeVersions,
    saveVersion,
    clearVersions,
  };
}
