import { useCallback, useState } from "react";
import { toast } from "sonner";
import { FileMapSchema } from "@/types/studio";
import { toClientFiles, toRuntimeFileMap } from "@/lib/fileUtils";
import type { ChatMessage, FileMap } from "@/types/studio";

interface UseAIChatParams {
  model: string;
  apiKey: string;
  systemPrompt: string;
  editMode: "full" | "patch";
  files: FileMap;
  onFilesUpdate: (files: FileMap) => void;
  onVersionSave: (files: FileMap, prompt: string, model: string) => void;
}

export function useAIChat({
  model,
  apiKey,
  systemPrompt,
  editMode,
  files,
  onFilesUpdate,
  onVersionSave,
}: UseAIChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const sandpackFiles = toRuntimeFileMap(files);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
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
      onVersionSave(normalized, currentInput, model);

      // Update files
      onFilesUpdate(normalized);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.explanation ?? "Updated project files.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      toast.success("Project updated");
    } catch (err: any) {
      toast.error(err?.message || "AI error");
    } finally {
      setLoading(false);
    }
  }, [apiKey, editMode, input, loading, messages, model, files, systemPrompt, onFilesUpdate, onVersionSave]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    input,
    setInput,
    loading,
    sendMessage,
    clearMessages,
  };
}
