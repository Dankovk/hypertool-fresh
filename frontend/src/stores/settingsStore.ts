import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MODEL_OPTIONS } from "@hypertool/shared-config/models";
import { DEFAULT_SYSTEM_PROMPT } from "../../../packages/shared-config/prompts";
import { config } from "@/config";

export interface SettingsState {
  model: string;
  apiKey: string;
  systemPrompt: string;
  editMode: "full" | "patch";
}

export interface SettingsActions {
  setModel: (model: string) => void;
  setApiKey: (apiKey: string) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setEditMode: (editMode: "full" | "patch") => void;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const initialState: SettingsState = {
  model: MODEL_OPTIONS[0].value,
  apiKey: "",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  editMode: "patch",
};

/**
 * Optimized settings store with localStorage persistence.
 * Uses Zustand's persist middleware for automatic syncing.
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,

      setModel: (model) => set({ model }),

      setApiKey: (apiKey) => set({ apiKey }),

      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),

      setEditMode: (editMode) => set({ editMode }),

      resetSettings: () => set(initialState),
    }),
    {
      name: config.storage.settingsKey,
      storage: createJSONStorage(() => localStorage),
      // Only persist the state, not the actions
      partialize: (state) => ({
        model: state.model,
        apiKey: state.apiKey,
        systemPrompt: state.systemPrompt,
        editMode: state.editMode,
      }),
    }
  )
);

// Optimized selectors for minimal re-renders
export const selectModel = (state: SettingsStore) => state.model;
export const selectApiKey = (state: SettingsStore) => state.apiKey;
export const selectSystemPrompt = (state: SettingsStore) => state.systemPrompt;
export const selectEditMode = (state: SettingsStore) => state.editMode;
export const selectAllSettings = (state: SettingsStore) => ({
  model: state.model,
  apiKey: state.apiKey,
  systemPrompt: state.systemPrompt,
  editMode: state.editMode,
});
