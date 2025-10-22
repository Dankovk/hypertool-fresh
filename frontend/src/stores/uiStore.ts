import { create } from "zustand";

export interface UIState {
  showVersionHistory: boolean;
  showPresets: boolean;
  showSettings: boolean;
}

export interface UIActions {
  setShowVersionHistory: (show: boolean) => void;
  setShowPresets: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  closeAllModals: () => void;
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  showVersionHistory: false,
  showPresets: false,
  showSettings: false,
};

/**
 * Optimized UI store for managing modal and UI state.
 * Keeps UI state separate from business logic.
 */
export const useUIStore = create<UIStore>()((set) => ({
  ...initialState,

  setShowVersionHistory: (show) => set({ showVersionHistory: show }),

  setShowPresets: (show) => set({ showPresets: show }),

  setShowSettings: (show) => set({ showSettings: show }),

  closeAllModals: () =>
    set({
      showVersionHistory: false,
      showPresets: false,
      showSettings: false,
    }),
}));

// Optimized selectors
export const selectShowVersionHistory = (state: UIStore) =>
  state.showVersionHistory;
export const selectShowPresets = (state: UIStore) => state.showPresets;
export const selectShowSettings = (state: UIStore) => state.showSettings;
export const selectAnyModalOpen = (state: UIStore) =>
  state.showVersionHistory || state.showPresets || state.showSettings;
