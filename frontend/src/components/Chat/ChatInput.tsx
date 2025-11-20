import { IconRocket, IconX } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  loading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, onCancel, loading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <div className="flex items-center gap-3 border-t border-border px-2 py-3">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text transition placeholder:text-muted-foreground focus-visible:ring-0 disabled:opacity-60"
        style={{
          outlineColor: "transparent",
          maxHeight: "160px",
        }}
        rows={1}
        placeholder="Describe the visual you want to create"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !loading) {
            e.preventDefault();
            onSubmit();
          }
        }}
        disabled={loading}
      />
      {loading ? (
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 text-white shadow-lg transition hover:bg-red-600 hover:shadow-xl self-end"
          onClick={onCancel}
          title="Cancel generation"
        >
          <IconX size={18} />
        </button>
      ) : (
        <button
          className="inline-flex h-10 w-10 items-center btn-bg-accent justify-center rounded-lg from-accent to-accent-2 text-background shadow-lg transition hover:shadow-xl disabled:opacity-50 self-end"
          onClick={onSubmit}
          disabled={loading}
        >
          <IconRocket size={18} />
        </button>
      )}
    </div>
  );
}
