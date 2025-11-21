import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MODEL_OPTIONS } from "@hypertool/shared-config/models";
import { config } from "@/config";

export interface SettingsState {
  model: string;
  apiKey: string;
  systemPrompt: string;
  editMode: "full" | "patch" | "artifact";
}

export interface SettingsActions {
  setModel: (model: string) => void;
  setApiKey: (apiKey: string) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setEditMode: (editMode: "full" | "patch" | "artifact") => void;
  resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

const initialState: SettingsState = {
  model: MODEL_OPTIONS[0].value,
  apiKey: "",
  systemPrompt: "", // Empty - let backend choose the appropriate prompt based on mode
  editMode: "artifact",
};

/**
 * Migration: Update legacy "patch" mode to "artifact" mode
 * This runs automatically when the store loads from localStorage
 */
function migrateSettings(persistedState: any): SettingsState {
  let migrated = false;
  const result = { ...persistedState };

  // If stored editMode is "patch", migrate to "artifact"
  if (persistedState?.editMode === "patch") {
    console.log("[Settings Migration] Migrating from patch mode to artifact mode");
    result.editMode = "artifact";
    migrated = true;
  }

  // Clear custom system prompt to use the backend's HyperFrame prompt
  // This ensures users get the new artifact-mode prompt automatically
  if (persistedState?.systemPrompt && persistedState.systemPrompt.trim() !== "") {
    console.log("[Settings Migration] Clearing custom system prompt to use backend default (HyperFrame prompt)");
    result.systemPrompt = "";
    migrated = true;
  }

  if (migrated) {
    console.log("[Settings Migration] Migration complete");
  }

  return result;
}

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
      // Run migration on load
      migrate: (persistedState: any, version: number) => {
        console.log("[Settings Store] Running migration, version:", version);
        return migrateSettings(persistedState);
      },
      version: 2, // Incremented to force migration run
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
