import { create } from "zustand";
import type { PresetInfo } from "@/types/studio";

export interface BoilerplateState {
  presets: PresetInfo[];
  isLoading: boolean;
}

export interface BoilerplateActions {
  setPresets: (presets: PresetInfo[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export type BoilerplateStore = BoilerplateState & BoilerplateActions;

const initialState: BoilerplateState = {
  presets: [],
  isLoading: false,
};

/**
 * Optimized boilerplate store for managing preset templates.
 */
export const useBoilerplateStore = create<BoilerplateStore>()((set) => ({
  ...initialState,

  setPresets: (presets) => set({ presets }),

  setLoading: (isLoading) => set({ isLoading }),
}));

// Optimized selectors
export const selectPresets = (state: BoilerplateStore) => state.presets;
export const selectIsLoading = (state: BoilerplateStore) => state.isLoading;
export const selectPresetById = (id: string) => (state: BoilerplateStore) =>
  state.presets.find((p) => p.id === id);
