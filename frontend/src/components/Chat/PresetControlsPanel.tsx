import { forwardRef, type ReactNode } from "react";
import { IconHistory, IconRefresh, IconTemplate } from "@tabler/icons-react";

interface PresetControlsPanelProps {
  onShowPresets: () => void;
  onShowHistory: () => void;
  onReset: () => void;
  hasVersionHistory: boolean;
  leftSlot?: ReactNode;
}

export const PresetControlsPanel = forwardRef<HTMLDivElement, PresetControlsPanelProps>(
  function PresetControlsPanel(
    { onShowPresets, onShowHistory, onReset, hasVersionHistory, leftSlot }: PresetControlsPanelProps,
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="flex items-center justify-between border-b border-border bg-accent/5 px-2 py-2"
      >
        <div className="flex items-center gap-2">{leftSlot}</div>
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm transition hover:bg-background/80"
            onClick={onShowPresets}
          >
            <IconTemplate size={18} /> Presets
          </button>
          {hasVersionHistory && (
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm transition hover:bg-background/80"
              onClick={onShowHistory}
            >
              <IconHistory size={18} /> History
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm transition hover:bg-background/80"
            onClick={onReset}
          >
            <IconRefresh size={18} /> Reset
          </button>
        </div>
      </div>
    );
  },
);

