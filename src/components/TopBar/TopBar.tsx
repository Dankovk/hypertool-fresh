"use client";

import { IconDownload, IconCamera, IconVideo, IconMaximize } from "@tabler/icons-react";

// TopBar component for preview controls

interface TopBarProps {
  onDownload: () => void;
  onCapturePNG: () => void;
  onRecordVideo: () => void;
  isRecording: boolean;
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onFitScreen: () => void;
}

export const TopBar = ({ 
  onDownload, 
  onCapturePNG, 
  onRecordVideo, 
  isRecording,
  width,
  height,
  maxWidth,
  maxHeight,
  onWidthChange,
  onHeightChange,
  onFitScreen
}: TopBarProps) => {
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      // Clamp to maximum width if exceeded
      const clampedValue = Math.min(value, maxWidth);
      onWidthChange(clampedValue);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      // Clamp to maximum height if exceeded
      const clampedValue = Math.min(value, maxHeight);
      onHeightChange(clampedValue);
    }
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-2 py-1">
        {/* Left side - Action buttons */}
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap"
            onClick={onCapturePNG}
          >
            <IconCamera size={18} />
            <span>Screenshot</span>
          </button>
          <button
            className={`inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm transition hover:bg-muted/80 whitespace-nowrap ${
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
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap"
            onClick={onDownload}
          >
            <IconDownload size={18} />
            <span>Code</span>
          </button>
        </div>

        {/* Center - Size controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">W:</label>
            <input
              type="number"
              value={width}
              onChange={handleWidthChange}
              className="rounded border border-border bg-background px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
              style={{ width: `${Math.max(width.toString().length * 8 + 16, 80)}px` }}
              min="100"
              max={maxWidth}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">H:</label>
            <input
              type="number"
              value={height}
              onChange={handleHeightChange}
              className="rounded border border-border bg-background px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
              style={{ width: `${Math.max(height.toString().length * 8 + 16, 80)}px` }}
              min="100"
              max={maxHeight}
            />
          </div>
          <button
            className="inline-flex items-center gap-1 h-[30px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap"
            onClick={onFitScreen}
            title="Fit to screen"
          >
            <IconMaximize size={16} />
          </button>
        </div>

        {/* Right side - Empty for balance */}
        <div className="w-32"></div>
      </div>
    </div>
  );
};
