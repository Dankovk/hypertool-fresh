import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { useChatStore, useFilesStore, useVersionsStore, useSettingsStore, usePreviewStore } from "@/stores";
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
  
  // Abort controller for cancelling requests
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      updateLastMessage?.('❌ Cancelled by user');
      toast.info('Request cancelled');
    }
  }, [setLoading, updateLastMessage]);

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
    // Always clear streaming text when starting a new request
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
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

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
                setStreamingText(fullText);
                // Don't update the actual message, only the dev panel
              } else if (event.type === "progress") {
                // Progress updates (e.g., "Generating edit 1...")
                fullText += event.text;
                setStreamingText(fullText);
                // Don't update the actual message, only the dev panel
              } else if (event.type === "complete") {
                try {
                  if (event.explanation) {
                    fullText = event.explanation;
                    updateLastMessage?.(event.explanation);
                  } else if (fullText) {
                    updateLastMessage?.(fullText);
                  } else {
                    const fallbackText = "Code updated successfully.";
                    fullText = fallbackText;
                    updateLastMessage?.(fallbackText);
                  }

                  if (event.files) {
                    const parsed = FileMapSchema.safeParse(event.files);

                    if (parsed.success) {
                      const normalized = toClientFiles(parsed.data);
                      addVersion(normalized, currentInput, model);
                      setFiles(normalized);

                      // Handle shell commands from artifacts
                      if (event.shellCommands && event.shellCommands.length > 0) {
                        usePreviewStore.getState().setShellCommands(event.shellCommands);
                        console.log('[AI] Received shell commands:', event.shellCommands);
                        toast.info(`${event.shellCommands.length} shell command(s) ready to execute`);
                      }

                      toast.success(`Files applied successfully! (${Object.keys(event.files).length} files)`);
                    } else {
                      updateLastMessage?.('❌ Failed to validate files.');
                      toast.error("Failed to validate files");
                      setLoading(false);
                    }
                  } else {
                    updateLastMessage?.('⚠️ No files were generated.');
                    toast.warning("No files generated");
                    setLoading(false);
                  }
                } catch (completeErr) {
                  updateLastMessage?.('❌ Error processing response.');
                  toast.error("Error processing AI response");
                  setLoading(false);
                }
              } else if (event.type === "warning") {
                if (event.details?.failed > 0) {
                  toast.warning(event.message, { duration: 8000 });
                }
              } else if (event.type === "error") {
                updateLastMessage?.(`❌ Backend Error: ${event.error}\n\nTry simplifying your request or switching to Full File mode.`);
                toast.error(`AI Error: ${event.error}`, { duration: 10000 });
                throw new Error(event.error);
              }
            } catch (e) {
              // Failed to parse event, skip it
            }
          }
        }
      }

      // After streaming is complete, processing is done in the "complete" event handler above
      console.log("[Streaming] Stream ended");

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      
      const errorMessage = err?.message || "AI error occurred";
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
      const isPatchError = errorMessage.includes('patch') || errorMessage.includes('search string');
      
      if (isNetworkError) {
        updateLastMessage?.('❌ Network error. Please check your connection.');
        toast.error("Network error");
      } else if (isPatchError) {
        updateLastMessage?.('❌ Failed to apply changes. Try:\n• Switching to Full File mode\n• Using a different model\n• Simplifying your request');
        toast.error("Failed to apply changes. Try Full File mode.", { duration: 10000 });
      } else {
        updateLastMessage?.(`❌ Error: ${errorMessage}`);
        toast.error(errorMessage, { duration: 8000 });
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
      
      if (process.env.NODE_ENV !== "development") {
        setStreamingText("");
      }
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
    cancelRequest,
    clearMessages,
  };
}

