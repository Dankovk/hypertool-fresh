"use client";

import { IconDownload, IconCamera, IconVideo } from "@tabler/icons-react";

// TopBar component for preview controls

interface TopBarProps {
  onDownload: () => void;
  onCapturePNG: () => void;
  onRecordVideo: () => void;
  isRecording: boolean;
}

export const TopBar = ({ onDownload, onCapturePNG, onRecordVideo, isRecording }: TopBarProps) => {
  return (
    <div className="absolute left-4 top-4 z-10">
      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap"
          onClick={onCapturePNG}
        >
          <IconCamera size={18} />
          <span>Screenshot</span>
        </button>
        <button
          className={`inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm transition hover:bg-muted/80 whitespace-nowrap ${
            isRecording 
              ? 'bg-red-500/20 text-red-400 border-red-500/30' 
              : 'bg-background/80 text-text'
          }`}
          onClick={onRecordVideo}
        >
          <IconVideo size={18} />
          <span>{isRecording ? 'Stop' : 'Rec'}</span>
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap"
          onClick={onDownload}
        >
          <IconDownload size={18} />
          <span>Code</span>
        </button>
      </div>
    </div>
  );
};
