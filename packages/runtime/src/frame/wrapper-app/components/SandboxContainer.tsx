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
 * - Display container size is derived from canvas size ÷ DPR
 * - If canvas is larger than viewport we scale the container via CSS transforms
 * - Presets set aspect ratio and maximize to fill container
 * - Drag handles on all edges and corners for resizing
 * - Dispatches window resize events when dimensions change
 */
export const SandboxContainer: React.FC<SandboxContainerProps> = ({ onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { canvasWidth, canvasHeight, scale, setCanvasSize, syncWithCanvas } = useCanvas();

  const [canvasSynced, setCanvasSynced] = useState(false);

  // Calculate physical and scaled dimensions
  const dpr = window.devicePixelRatio || 1;
  const containerWidth = Math.max(1, Math.round(canvasWidth / dpr));
  const containerHeight = Math.max(1, Math.round(canvasHeight / dpr));
  const scaledWidth = Math.max(1, Math.round(containerWidth * scale));
  const scaledHeight = Math.max(1, Math.round(containerHeight * scale));

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

  // Dispatch window resize event when canvas dimensions or scale change
  useEffect(() => {
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);
    
    console.log('[SandboxContainer] Dispatched resize event:', { 
      canvas: { width: canvasWidth, height: canvasHeight },
      container: { width: containerWidth, height: containerHeight },
      display: { width: scaledWidth, height: scaledHeight },
      scale 
    });
  }, [canvasWidth, canvasHeight, containerWidth, containerHeight, scaledWidth, scaledHeight, scale]);

  return (
    <div className="hyper-frame-sandbox-wrapper absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        ref={wrapperRef}
        className="hyper-frame-sandbox-display-container relative pointer-events-auto"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
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
          className="hyper-frame-sandbox-container absolute top-0 left-0 flex items-center justify-center"
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            overflow: 'hidden',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  );
};
