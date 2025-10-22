import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { StreamingPreview } from "./StreamingPreview";
import type { ChatMessage as ChatMessageType } from "@/types/studio";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  loading: boolean;
  streamingText?: string;
}

export function ChatMessages({ messages, loading, streamingText }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log("[ChatMessages] streamingText prop:", streamingText ? `${streamingText.length} chars` : "empty");

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
      {streamingText && <StreamingPreview streamingText={streamingText} />}
      {loading && !streamingText && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}
