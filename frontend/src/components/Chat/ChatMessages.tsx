import { useEffect, useRef, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { StreamingPreview } from "./StreamingPreview";
import type { ChatMessage as ChatMessageType } from "@/types/studio";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  loading: boolean;
  streamingText?: string;
}

// Extract only text content, removing code blocks
function extractTextContent(text: string): string {
  if (!text) return "";

  // Remove JSON code blocks
  let result = text.replace(/```json\s*\n[\s\S]*?(?:```|$)/g, "");

  // Remove other code blocks
  result = result.replace(/```\w*\s*\n[\s\S]*?(?:```|$)/g, "");

  return result.trim();
}

// Check if text contains code blocks
function hasCodeBlocks(text: string): boolean {
  return /```/.test(text);
}

export function ChatMessages({ messages, loading, streamingText }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const streamingTextContent = useMemo(() => {
    return streamingText ? extractTextContent(streamingText) : "";
  }, [streamingText]);

  const showStreamingPreview = useMemo(() => {
    return streamingText && hasCodeBlocks(streamingText);
  }, [streamingText]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingText]);

  return (
    <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      {messages.length === 0 && (
        <div className="max-w-[85%] rounded-2xl border border-[#1e3a4d] bg-gradient-to-br from-[#0f1922] to-[#162028] px-4 py-3 text-sm shadow-brand-sm">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            assistant
          </div>
          <div className="leading-relaxed text-text">Describe the visual you want and I&apos;ll update the sketch.</div>
        </div>
      )}

      {/* Show streaming text content in regular message */}
      {streamingTextContent && (
        <div className="max-w-[85%] rounded-2xl border border-[#1e3a4d] bg-gradient-to-br from-[#0f1922] to-[#162028] px-4 py-3 text-sm shadow-brand-sm animate-slide-in">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            assistant
          </div>
          <div className="leading-relaxed text-text whitespace-pre-wrap">{streamingTextContent}</div>
        </div>
      )}

      {/* Show code blocks in streaming preview */}
      {showStreamingPreview && <StreamingPreview streamingText={streamingText!} isStreaming={loading} />}

      {loading && !streamingText && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}
