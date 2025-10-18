import type { ChatMessage as ChatMessageType } from "@/types/studio";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`max-w-[85%] rounded-2xl border px-4 py-3 text-base shadow-brand-sm animate-slide-in ${
        message.role === "assistant"
          ? "border-[#1e3a4d] bg-gradient-to-br from-[#0f1922] to-[#162028]"
          : "ml-auto border-[#333] bg-gradient-to-br from-[#1a1a1a] to-[#242424]"
      }`}
    >
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
        {message.role}
      </div>
      <div className="leading-relaxed text-text">{message.content}</div>
    </div>
  );
}
