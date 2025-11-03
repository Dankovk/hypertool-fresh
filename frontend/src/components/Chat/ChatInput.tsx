import { IconRocket, IconX } from "@tabler/icons-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  loading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, onCancel, loading }: ChatInputProps) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-5 py-4">
      <input
        type="text"
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text transition"
        style={{
          outlineColor: "transparent",
        }}
        placeholder="Describe the visual you want (p5.js)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !loading) onSubmit();
        }}
        disabled={loading}
      />
      {loading ? (
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 text-white shadow-lg transition hover:bg-red-600 hover:shadow-xl"
          onClick={onCancel}
          title="Cancel generation"
        >
          <IconX size={18} />
        </button>
      ) : (
        <button
          className="inline-flex h-10 w-10 items-center btn-bg-accent justify-center rounded-lg from-accent to-accent-2 text-background shadow-lg transition hover:shadow-xl disabled:opacity-50"
          onClick={onSubmit}
          disabled={loading}
        >
          <IconRocket size={18} />
        </button>
      )}
    </div>
  );
}
