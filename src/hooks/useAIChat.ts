import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useChatStore, useFilesStore, useVersionsStore, useSettingsStore } from "@/stores";
import { FileMapSchema } from "@/types/studio";
import { toClientFiles, toRuntimeFileMap } from "@/lib/fileUtils";
import { apiFetch, getApiUrl, API_ENDPOINTS } from "@/lib/api-client";
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
  const updateLastMessage = useChatStore((state) => state.updateLastMessage);
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

  // Local streaming state
  const [streamingText, setStreamingText] = useState<string>("");

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
    setStreamingText("");

    // Add placeholder assistant message for streaming
    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
    };
    addMessage(assistantMsg);

    try {
      const sandpackFiles = toRuntimeFileMap(files);
      const url = getApiUrl(API_ENDPOINTS.AI_STREAM);

      console.log(`[Streaming] Initiating request to: ${url}`);
      console.log(`[Streaming] Model: ${model}, Edit mode: ${editMode}`);

      const response = await fetch(url, {
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

      if (!response.ok) {
        console.error(`[Streaming] Request failed with status: ${response.status}`);
        throw new Error("AI streaming failed");
      }

      console.log("[Streaming] Connected, reading stream...");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data);

              if (event.type === "start") {
                console.log("[Streaming] Started");
              } else if (event.type === "token") {
                fullText += event.text;
                console.log(`[Streaming] Token received, setting streamingText to: "${fullText.substring(0, 50)}..." (${fullText.length} chars)`);
                setStreamingText(fullText);
                updateLastMessage?.(fullText);
              } else if (event.type === "progress") {
                // Progress updates (e.g., "Generating edit 1...")
                fullText += event.text;
                console.log(`[Streaming] Progress received, setting streamingText to: "${fullText.substring(0, 50)}..." (${fullText.length} chars)`);
                setStreamingText(fullText);
                updateLastMessage?.(fullText);
              } else if (event.type === "complete") {
                console.log(`[Streaming] Complete! Processing files...`);

                // Update the message with explanation/summary text
                // Always use the explanation from complete event as it may contain a generated summary
                if (event.explanation) {
                  fullText = event.explanation;
                  updateLastMessage?.(event.explanation);
                } else if (!fullText) {
                  // Fallback if no explanation and no progress was shown
                  const fallbackText = "Code updated successfully.";
                  fullText = fallbackText;
                  updateLastMessage?.(fallbackText);
                }

                // Parse and apply files
                if (event.files) {
                  console.log(`[Streaming] Received ${Object.keys(event.files).length} files`);

                  try {
                    const parsed = FileMapSchema.safeParse(event.files);

                    if (parsed.success) {
                      const normalized = toClientFiles(parsed.data);
                      console.log(`[Streaming] Applying ${Object.keys(normalized).length} files to project`);

                      // Add to version history
                      addVersion(normalized, currentInput, model);

                      // Apply files to the project
                      setFiles(normalized);

                      toast.success("Files applied successfully!");
                    } else {
                      console.error("[Streaming] File validation failed:", parsed.error);
                      toast.error("Failed to validate files");
                    }
                  } catch (err) {
                    console.error("[Streaming] Error parsing files:", err);
                    toast.error("Failed to parse files");
                  }
                } else {
                  console.warn("[Streaming] No files in complete event");
                }
              } else if (event.type === "error") {
                console.error("[Streaming] Error:", event.error);
                throw new Error(event.error);
              }
            } catch (e) {
              console.warn("Failed to parse SSE event:", e);
            }
          }
        }
      }

      // After streaming is complete, processing is done in the "complete" event handler above
      console.log("[Streaming] Stream ended");

    } catch (err: any) {
      toast.error(err?.message || "AI error");
    } finally {
      setLoading(false);
      setStreamingText("");
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
    updateLastMessage,
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
    streamingText,
    sendMessage,
    clearMessages,
  };
}
