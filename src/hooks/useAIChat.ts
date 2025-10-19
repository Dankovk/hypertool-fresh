import { useCallback } from "react";
import { toast } from "sonner";
import { useChatStore, useFilesStore, useVersionsStore, useSettingsStore } from "@/stores";
import { FileMapSchema } from "@/types/studio";
import { toClientFiles, toRuntimeFileMap } from "@/lib/fileUtils";
import type { ChatMessage } from "@/types/studio";

/**
 * Hook for AI chat functionality using Zustand stores.
 * Integrates chat, files, versions, and settings stores.
 */
export function useAIChat() {
  // Chat store
  const messages = useChatStore((state) => state.messages);
  const input = useChatStore((state) => state.input);
  const loading = useChatStore((state) => state.isLoading);
  const setInput = useChatStore((state) => state.setInput);
  const clearInput = useChatStore((state) => state.clearInput);
  const setLoading = useChatStore((state) => state.setLoading);
  const addMessage = useChatStore((state) => state.addMessage);
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Files store
  const files = useFilesStore((state) => state.files);
  const setFiles = useFilesStore((state) => state.setFiles);

  // Versions store
  const addVersion = useVersionsStore((state) => state.addVersion);

  // Settings store
  const model = useSettingsStore((state) => state.model);
  const apiKey = useSettingsStore((state) => state.apiKey);
  const systemPrompt = useSettingsStore((state) => state.systemPrompt);
  const editMode = useSettingsStore((state) => state.editMode);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    addMessage(userMsg);
    const currentInput = input;
    clearInput();
    setLoading(true);

    try {
      const sandpackFiles = toRuntimeFileMap(files);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          model,
          apiKey: apiKey.trim() || undefined,
          systemPrompt: systemPrompt.trim() || undefined,
          currentFiles: sandpackFiles,
          editMode,
        }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const json = await res.json();
      const parsed = FileMapSchema.safeParse(json.files);
      if (!parsed.success) throw new Error("Invalid AI result");

      const normalized = toClientFiles(parsed.data);

      // Save version before updating
      addVersion(normalized, currentInput, model);

      // Update files
      setFiles(normalized);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.explanation ?? "Updated project files.",
      };
      addMessage(assistantMsg);
      toast.success("Project updated");
    } catch (err: any) {
      toast.error(err?.message || "AI error");
    } finally {
      setLoading(false);
    }
  }, [
    input,
    loading,
    messages,
    files,
    model,
    apiKey,
    systemPrompt,
    editMode,
    addMessage,
    clearInput,
    setLoading,
    addVersion,
    setFiles,
  ]);

  return {
    messages,
    input,
    setInput,
    loading,
    sendMessage,
    clearMessages,
  };
}
