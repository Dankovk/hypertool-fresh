import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ChatMessage } from "@/types/studio";

export interface ChatState {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
}

export interface ChatActions {
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setInput: (input: string) => void;
  setLoading: (isLoading: boolean) => void;
  clearMessages: () => void;
  clearInput: () => void;
  reset: () => void;
}

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  messages: [],
  input: "",
  isLoading: false,
};

/**
 * Optimized chat store with immer for efficient message updates.
 * Handles chat messages, input state, and loading state.
 */
export const useChatStore = create<ChatStore>()(
  immer((set) => ({
    ...initialState,

    setMessages: (messages) =>
      set((state) => {
        state.messages = messages;
      }),

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
      }),

    setInput: (input) =>
      set((state) => {
        state.input = input;
      }),

    setLoading: (isLoading) =>
      set((state) => {
        state.isLoading = isLoading;
      }),

    clearMessages: () =>
      set((state) => {
        state.messages = [];
      }),

    clearInput: () =>
      set((state) => {
        state.input = "";
      }),

    reset: () => set(initialState),
  }))
);

// Optimized selectors for minimal re-renders
export const selectMessages = (state: ChatStore) => state.messages;
export const selectInput = (state: ChatStore) => state.input;
export const selectIsLoading = (state: ChatStore) => state.isLoading;
export const selectMessageCount = (state: ChatStore) => state.messages.length;
export const selectCanSend = (state: ChatStore) =>
  state.input.trim().length > 0 && !state.isLoading;
