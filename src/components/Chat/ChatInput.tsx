import { IconRocket } from "@tabler/icons-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, loading }: ChatInputProps) {
  return (
    <div className="flex items-center gap-3 border-t border-border bg-black/20 px-5 py-4">
      <input
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base text-text shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder="Describe the visual you want (p5.js)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) onSubmit();
        }}
      />
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-background shadow-lg transition hover:shadow-xl disabled:opacity-50"
        onClick={onSubmit}
        disabled={loading}
      >
        <IconRocket size={18} />
      </button>
    </div>
  );
}
