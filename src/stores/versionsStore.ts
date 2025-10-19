import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { config } from "@/config";
import type { CodeVersion, FileMap } from "@/types/studio";

export interface VersionsState {
  versions: CodeVersion[];
}

export interface VersionsActions {
  addVersion: (files: FileMap, prompt: string, model: string) => void;
  clearVersions: () => void;
  removeVersion: (id: string) => void;
}

export type VersionsStore = VersionsState & VersionsActions;

const initialState: VersionsState = {
  versions: [],
};

/**
 * Optimized versions store for managing code history.
 * Automatically limits history to maxVersions from config.
 */
export const useVersionsStore = create<VersionsStore>()(
  immer((set) => ({
    ...initialState,

    addVersion: (files, prompt, model) =>
      set((state) => {
        const version: CodeVersion = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          files,
          prompt,
          model,
        };
        // Add to beginning and limit to maxVersions
        state.versions.unshift(version);
        if (state.versions.length > config.history.maxVersions) {
          state.versions = state.versions.slice(0, config.history.maxVersions);
        }
      }),

    clearVersions: () =>
      set((state) => {
        state.versions = [];
      }),

    removeVersion: (id) =>
      set((state) => {
        state.versions = state.versions.filter((v) => v.id !== id);
      }),
  }))
);

// Optimized selectors
export const selectVersions = (state: VersionsStore) => state.versions;
export const selectVersionCount = (state: VersionsStore) =>
  state.versions.length;
export const selectHasVersions = (state: VersionsStore) =>
  state.versions.length > 0;
export const selectLatestVersion = (state: VersionsStore) =>
  state.versions[0] ?? null;
