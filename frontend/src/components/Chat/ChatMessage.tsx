import type { ChatMessage as ChatMessageType } from "@/types/studio";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`max-w-[85%] rounded-2xl bg-dark-accent px-4 py-3 overflow-scroll text-sm animate-slide-in ${
        message.role === "assistant"
          ? ""
          : "ml-auto"
      }`}
    >
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
        {message.role}
      </div>
      <div className="leading-relaxed text-text">{message.content}</div>
    </div>
  );
}
