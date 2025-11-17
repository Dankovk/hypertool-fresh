import React, { useRef, useEffect, useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { ResizeHandles } from './ResizeHandles';
import type { SandboxContainerProps } from '../types';

/**
 * SandboxContainer - Container for the user's canvas/sketch with drag-resizing
 *
 * Features:
 * - Renders user code (p5.js, Three.js, etc.) at canvas size
 * - Canvas dimensions are PRECISELY set via CanvasContext (DPI-aware)
 * - Display container size = canvasWidth/Height × scale (logical pixels)
 * - Presets set aspect ratio and maximize to fill container
 * - Drag handles on all edges and corners for resizing
 * - Dispatches window resize events when dimensions change
 */
export const SandboxContainer: React.FC<SandboxContainerProps> = ({ onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { canvasWidth, canvasHeight, scale, setCanvasSize, syncWithCanvas } = useCanvas();

  const [canvasSynced, setCanvasSynced] = useState(false);

  // Calculate display dimensions (canvas size / devicePixelRatio for display)
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.round((canvasWidth / dpr) * scale);
  const displayHeight = Math.round((canvasHeight / dpr) * scale);

  useEffect(() => {
    if (containerRef.current) {
      onReady(containerRef.current);
    }
  }, [onReady]);

  // Detect and sync with actual canvas element dimensions
  useEffect(() => {
    if (!containerRef.current || canvasSynced) return;

    const checkCanvas = () => {
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas && canvas instanceof HTMLCanvasElement) {
        const actualWidth = canvas.width;
        const actualHeight = canvas.height;
        
        // Only sync if canvas has meaningful dimensions and differs from current
        if (actualWidth > 100 && actualHeight > 100) {
          const widthDiff = Math.abs(actualWidth - canvasWidth);
          const heightDiff = Math.abs(actualHeight - canvasHeight);
          
          // Sync if there's a significant difference (more than 10%)
          if (widthDiff > canvasWidth * 0.1 || heightDiff > canvasHeight * 0.1) {
            console.log('[SandboxContainer] Canvas detected, syncing dimensions');
            syncWithCanvas(canvas);
            setCanvasSynced(true);
          }
        }
      }
    };

    // Check immediately
    checkCanvas();

    // Also check periodically for up to 3 seconds
    const interval = setInterval(checkCanvas, 100);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setCanvasSynced(true); // Stop trying after 3 seconds
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [containerRef, canvasWidth, canvasHeight, canvasSynced, syncWithCanvas]);

  // Dispatch window resize event when canvas dimensions change
  useEffect(() => {
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);
    
    console.log('[SandboxContainer] Dispatched resize event:', { 
      canvas: { width: canvasWidth, height: canvasHeight },
      display: { width: displayWidth, height: displayHeight },
      scale 
    });
  }, [canvasWidth, canvasHeight, displayWidth, displayHeight, scale]);

  return (
    <div className="hyper-frame-sandbox-wrapper absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        ref={wrapperRef}
        className="hyper-frame-sandbox-display-container relative pointer-events-auto"
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Resize Handles */}
        <ResizeHandles 
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          scale={scale}
          onResize={setCanvasSize}
        />

        {/* Canvas container - scaled to fit */}
        <div
          ref={containerRef}
          className="hyper-frame-sandbox-container absolute inset-0 flex items-center justify-center"
          style={{
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
};
