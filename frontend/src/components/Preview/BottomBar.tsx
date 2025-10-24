"use client";

import { IconDownload } from "@tabler/icons-react";

interface BottomBarProps {
  onDownload: () => void;
}

export const BottomBar = ({ onDownload }: BottomBarProps) => {
  return (
    <div className="bottom-bar-container absolute left-2 z-10">
      <button
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-text transition"
        onClick={onDownload}
      >
        <IconDownload size={18} />
        <span>Code</span>
      </button>
    </div>
  );
};

