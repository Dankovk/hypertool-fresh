import { Modal } from "./Modal";
import { MODEL_OPTIONS } from "@hypertool/shared-config/models";
import type { CodeVersion } from "@/types/studio";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: CodeVersion[];
  onRestoreVersion: (version: CodeVersion) => void;
}

export function VersionHistoryModal({ isOpen, onClose, versions, onRestoreVersion }: VersionHistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Version History">
      <div className="grid gap-3">
        {versions.map((version) => (
          <button
            key={version.id}
            className="flex flex-col items-start gap-1 rounded-lg border border-border bg-background p-4 text-left transition hover:border-accent hover:bg-background/80"
            onClick={() => onRestoreVersion(version)}
          >
            <div className="flex items-center gap-2 text-xs">
              <span>{new Date(version.timestamp).toLocaleString()}</span>
              <span>•</span>
              <span className="font-mono">{MODEL_OPTIONS.find(m => m.value === version.model)?.label || version.model}</span>
            </div>
            <div className="text-sm text-text">{version.prompt}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
