import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage as ChatMessageType } from "@/types/studio";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  loading: boolean;
}

export function ChatMessages({ messages, loading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
      {messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      {messages.length === 0 && (
        <div className="max-w-[85%] rounded-2xl bg-dark-accent px-4 py-3 text-sm overflow-scroll">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            assistant
          </div>
          <div className="leading-relaxed text-text">Describe the visual you want and I&apos;ll update the sketch.</div>
        </div>
      )}
      {loading && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}
