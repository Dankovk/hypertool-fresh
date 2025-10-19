import { useSettingsStore } from "@/stores";

/**
 * Hook for accessing studio settings from Zustand store.
 * Settings are automatically persisted to localStorage via the store.
 */
export function useStudioSettings() {
  const model = useSettingsStore((state) => state.model);
  const setModel = useSettingsStore((state) => state.setModel);
  const apiKey = useSettingsStore((state) => state.apiKey);
  const setApiKey = useSettingsStore((state) => state.setApiKey);
  const systemPrompt = useSettingsStore((state) => state.systemPrompt);
  const setSystemPrompt = useSettingsStore((state) => state.setSystemPrompt);
  const editMode = useSettingsStore((state) => state.editMode);
  const setEditMode = useSettingsStore((state) => state.setEditMode);

  return {
    model,
    setModel,
    apiKey,
    setApiKey,
    systemPrompt,
    setSystemPrompt,
    editMode,
    setEditMode,
  };
}
