import { create } from 'zustand';

interface PreviewState {
  shellCommands: string[];
  isExecuting: boolean;
  executionLog: string[];

  setShellCommands: (commands: string[]) => void;
  clearShellCommands: () => void;
  setExecuting: (executing: boolean) => void;
  addExecutionLog: (log: string) => void;
  clearExecutionLog: () => void;
}

export const usePreviewStore = create<PreviewState>((set) => ({
  shellCommands: [],
  isExecuting: false,
  executionLog: [],

  setShellCommands: (commands) => set({ shellCommands: commands }),
  clearShellCommands: () => set({ shellCommands: [] }),
  setExecuting: (executing) => set({ isExecuting: executing }),
  addExecutionLog: (log) => set((state) => ({
    executionLog: [...state.executionLog, log]
  })),
  clearExecutionLog: () => set({ executionLog: [] }),
}));
