import React, { useState, useEffect } from 'react';
import { useCanvas } from '../context/CanvasContext';

// Standard screen presets
const PRESETS = [
  { label: '16:9 Landscape', width: 1920, height: 1080 },
  { label: '9:16 Portrait', width: 1080, height: 1920 },
  { label: '4:3 Standard', width: 1024, height: 768 },
  { label: '1:1 Square', width: 1080, height: 1080 },
  { label: '21:9 Ultrawide', width: 2560, height: 1080 },
  { label: '3:2 Classic', width: 1440, height: 960 },
  { label: '---', width: 0, height: 0 }, // Divider
  { label: 'iPhone 15 Pro', width: 1179, height: 2556 },
  { label: 'iPhone 15 Pro Max', width: 1290, height: 2796 },
  { label: 'iPhone SE', width: 750, height: 1334 },
  { label: 'iPhone 15', width: 1170, height: 2532 },
  { label: '---', width: 0, height: 0 }, // Divider
  { label: 'MacBook Air 13"', width: 2560, height: 1664 },
  { label: 'MacBook Pro 14"', width: 3024, height: 1964 },
  { label: 'MacBook Pro 16"', width: 3456, height: 2234 },
  { label: 'iMac 24"', width: 4480, height: 2520 },
  { label: 'Studio Display', width: 5120, height: 2880 },
];

/**
 * CanvasSizeWidget - Canvas size control UI
 * 
 * Displays and manages:
 * - Width input (updates on Enter or blur)
 * - Height input (updates on Enter or blur)
 * - Preset sizes dropdown
 * - Scale indicator (shows current zoom level)
 * - Fit to screen button
 * 
 * All state and logic come from CanvasContext.
 */
export const CanvasSizeWidget: React.FC = () => {
  const { 
    canvasWidth, 
    canvasHeight, 
    scale,
    setCanvasWidth, 
    setCanvasHeight, 
    fitToScreen 
  } = useCanvas();
  
  // Local state for inputs
  const [widthInput, setWidthInput] = useState(canvasWidth.toString());
  const [heightInput, setHeightInput] = useState(canvasHeight.toString());

  // Sync local state when canvas context changes externally
  useEffect(() => {
    setWidthInput(canvasWidth.toString());
  }, [canvasWidth]);

  useEffect(() => {
    setHeightInput(canvasHeight.toString());
  }, [canvasHeight]);

  const applyWidth = () => {
    const value = Math.round(parseFloat(widthInput)); // Round to integer
    if (!isNaN(value) && value >= 100) {
      setCanvasWidth(value);
      setWidthInput(value.toString()); // Update input to show rounded value
    } else {
      // Reset to current value if invalid
      setWidthInput(canvasWidth.toString());
    }
  };

  const applyHeight = () => {
    const value = Math.round(parseFloat(heightInput)); // Round to integer
    if (!isNaN(value) && value >= 100) {
      setCanvasHeight(value);
      setHeightInput(value.toString()); // Update input to show rounded value
    } else {
      // Reset to current value if invalid
      setHeightInput(canvasHeight.toString());
    }
  };

  const handleWidthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyWidth();
      e.currentTarget.blur();
    }
  };

  const handleHeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyHeight();
      e.currentTarget.blur();
    }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS.find(p => p.label === e.target.value);
    if (preset && preset.width > 0 && preset.height > 0) {
      const dpr = window.devicePixelRatio || 1;
      setCanvasWidth(preset.width * 0.95 * dpr);
      setCanvasHeight(preset.height * 0.95 * dpr);
    }
  };

  // Calculate display dimensions (what's actually shown on screen)
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.round((canvasWidth / dpr) * scale);
  const displayHeight = Math.round((canvasHeight / dpr) * scale);
  
  // Calculate actual scale ratio: display container size vs canvas pixel size
  // This updates in real-time as canvasWidth/canvasHeight/scale change
  // On 2x display with 1600px canvas showing at 800px container = 50%
  const actualScale = scale / dpr;
  const scalePercent = Math.round(actualScale * 100);
  
  // Show comparison: canvas size vs display size
  const canvasSize = `${canvasWidth}×${canvasHeight}`;
  const displaySize = `${displayWidth}×${displayHeight}`;
  const isScaled = actualScale < 1;

  return (
    <div className="canvas-size-widget-container absolute top-0 center px-2 py-2 z-[9999] flex items-center gap-2">
      {/* Presets Dropdown */}
      <select
        onChange={handlePresetChange}
        className="rounded border border-border w-[90px] bg-background px-2 py-1 text-sm text-text focus:border-accent focus:outline-none cursor-pointer"
        defaultValue=""
      >
        <option value="" disabled>Presets</option>
        {PRESETS.map((preset, idx) => 
          preset.label === '---' ? (
            <option key={idx} disabled>────────</option>
          ) : (
            <option key={idx} value={preset.label}>
              {preset.label}
            </option>
          )
        )}
      </select>

      {/* Width Input */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-accent">W:</label>
        <input
          // type="number"
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          onBlur={applyWidth}
          onKeyDown={handleWidthKeyDown}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
          style={{ width: `${Math.max(widthInput.length * 8 + 16, 50)}px` }}
          min="60"
          step="1"
        />
      </div>

      {/* Height Input */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-accent">H:</label>
        <input
          // type="number"
          value={heightInput}
          onChange={(e) => setHeightInput(e.target.value)}
          onBlur={applyHeight}
          onKeyDown={handleHeightKeyDown}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
          style={{ width: `${Math.max(heightInput.length * 8 + 16, 50)}px` }}
          min="60"
          step="1"
        />
      </div>

      {/* Scale Indicator - Shows canvas vs display comparison */}
      <div 
        className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-background/50"
        title={isScaled 
          ? `Canvas: ${canvasSize} → Display: ${displaySize} (scaled to ${scalePercent}%)`
          : `Canvas: ${canvasSize} = Display: ${displaySize} (no scaling)`
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isScaled ? "text-accent" : "text-muted"}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        <div className="flex items-center gap-1">
          {/* <span className={`text-xs font-medium ${isScaled ? "text-accent" : "text-muted"}`}>
            {canvasSize}
          </span> */}
          {/* {isScaled && (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <span className="text-xs font-medium text-accent">
                {displaySize}
              </span>
            </>
          )} */}
          <span className={`text-xs ${isScaled ? "text-accent" : "text-muted"}`}>
            {scalePercent}%
          </span>
        </div>
      </div>

      {/* Fit to Screen Button */}
      <button
        type="button"
        className="inline-flex items-center gap-1 h-[30px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap"
        onClick={fitToScreen}
        title="Fit to screen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
          <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
        </svg>
      </button>
    </div>
  );
};

