import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-brand" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
          <div className="text-lg font-semibold tracking-tight text-accent">{title}</div>
          <button className="text-text-secondary hover:text-text" onClick={onClose}>✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
