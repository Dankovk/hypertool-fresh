import { Modal } from "./Modal";
import type { PresetInfo } from "@/types/studio";

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: PresetInfo[];
  onSelectPreset: (presetId: string) => void;
}

export function PresetsModal({ isOpen, onClose, presets, onSelectPreset }: PresetsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a Preset">
      <div className="grid gap-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            className="flex flex-col items-start gap-1 rounded-lg border border-border bg-background p-4 text-left transition hover:border-accent hover:bg-muted"
            onClick={() => onSelectPreset(preset.id)}
          >
            <div className="font-semibold text-text">{preset.name}</div>
            <div className="text-sm text-text-secondary">{preset.description}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
