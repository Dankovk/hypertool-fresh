import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { FileMap } from "@/types/studio";

export interface FilesState {
  files: FileMap;
  isLoading: boolean;
}

export interface FilesActions {
  setFiles: (files: FileMap) => void;
  updateFile: (path: string, content: string) => void;
  deleteFile: (path: string) => void;
  addFile: (path: string, content: string) => void;
  setLoading: (isLoading: boolean) => void;
  resetFiles: () => void;
}

export type FilesStore = FilesState & FilesActions;

const initialState: FilesState = {
  files: {},
  isLoading: false,
};

/**
 * Optimized files store using immer for immutable updates.
 * Manages all project files with efficient mutations.
 */
export const useFilesStore = create<FilesStore>()(
  immer((set) => ({
    ...initialState,

    setFiles: (files) =>
      set((state) => {
        state.files = files;
      }),

    updateFile: (path, content) =>
      set((state) => {
        if (state.files[path] !== undefined) {
          state.files[path] = content;
        }
      }),

    deleteFile: (path) =>
      set((state) => {
        delete state.files[path];
      }),

    addFile: (path, content) =>
      set((state) => {
        state.files[path] = content;
      }),

    setLoading: (isLoading) =>
      set((state) => {
        state.isLoading = isLoading;
      }),

    resetFiles: () => set(initialState),
  }))
);

// Optimized selectors
export const selectFiles = (state: FilesStore) => state.files;
export const selectIsLoading = (state: FilesStore) => state.isLoading;
export const selectFile = (path: string) => (state: FilesStore) =>
  state.files[path];
export const selectFileCount = (state: FilesStore) =>
  Object.keys(state.files).length;
