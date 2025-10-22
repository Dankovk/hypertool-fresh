import { useState } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

interface StreamingPreviewProps {
  streamingText: string;
}

export function StreamingPreview({ streamingText }: StreamingPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  console.log("[StreamingPreview] Received streamingText:", streamingText ? `${streamingText.length} chars` : "empty");

  if (!streamingText) {
    return null;
  }

  const tokenCount = streamingText.split(/\s+/).filter(Boolean).length;
  const charCount = streamingText.length;

  return (
    <div className="rounded-2xl border border-[#2a4a5d] bg-gradient-to-br from-[#0f1922] to-[#162028] shadow-brand-sm animate-slide-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Streaming Preview
          </div>
          <div className="text-xs text-text-secondary/60">
            {tokenCount} words • {charCount} chars
          </div>
        </div>
        {isExpanded ? (
          <IconChevronUp size={16} className="text-text-secondary" />
        ) : (
          <IconChevronDown size={16} className="text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-[#1e3a4d] px-4 py-3">
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-text font-mono">
              {streamingText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
