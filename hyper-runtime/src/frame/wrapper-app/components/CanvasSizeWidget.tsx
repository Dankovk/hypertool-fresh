import React, { useState, useEffect } from 'react';
import { useCanvas } from '../context/CanvasContext';

/**
 * CanvasSizeWidget - Canvas size control UI
 * 
 * Displays and manages:
 * - Width input (updates on Enter or blur)
 * - Height input (updates on Enter or blur)
 * - Fit to screen button
 * 
 * All state and logic come from CanvasContext.
 */
export const CanvasSizeWidget: React.FC = () => {
  const { width, height, maxWidth, maxHeight, setWidth, setHeight, fitToScreen } = useCanvas();
  
  // Local state for inputs
  const [widthInput, setWidthInput] = useState(width.toString());
  const [heightInput, setHeightInput] = useState(height.toString());

  // Sync local state when canvas context changes externally
  useEffect(() => {
    setWidthInput(width.toString());
  }, [width]);

  useEffect(() => {
    setHeightInput(height.toString());
  }, [height]);

  const applyWidth = () => {
    const value = parseInt(widthInput);
    if (!isNaN(value) && value >= 100 && value <= maxWidth) {
      setWidth(value);
    } else {
      // Reset to current value if invalid
      setWidthInput(width.toString());
    }
  };

  const applyHeight = () => {
    const value = parseInt(heightInput);
    if (!isNaN(value) && value >= 100 && value <= maxHeight) {
      setHeight(value);
    } else {
      // Reset to current value if invalid
      setHeightInput(height.toString());
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

  return (
    <div className="canvas-size-widget-container absolute top-0 center px-2 py-2 z-[9999] flex items-center gap-2">
      {/* Width Input */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">W:</label>
        <input
          type="number"
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          onBlur={applyWidth}
          onKeyDown={handleWidthKeyDown}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
          style={{ width: `${Math.max(widthInput.length * 8 + 16, 80)}px` }}
          min="100"
          max={maxWidth}
        />
      </div>

      {/* Height Input */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-text-secondary">H:</label>
        <input
          type="number"
          value={heightInput}
          onChange={(e) => setHeightInput(e.target.value)}
          onBlur={applyHeight}
          onKeyDown={handleHeightKeyDown}
          className="rounded border border-border bg-background px-2 py-1 text-sm text-text focus:border-accent focus:outline-none"
          style={{ width: `${Math.max(heightInput.length * 8 + 16, 80)}px` }}
          min="100"
          max={maxHeight}
        />
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

