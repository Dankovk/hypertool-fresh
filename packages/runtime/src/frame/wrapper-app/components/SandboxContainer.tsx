import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvas } from '../context/CanvasContext';
import type { SandboxContainerProps } from '../types';

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * SandboxContainer - Container for the user's canvas/sketch with drag-resizing
 *
 * Features:
 * - Renders user code (p5.js, Three.js, etc.) at canvas size
 * - Scales down to fit display size when canvas > display
 * - Drag handles on all edges and corners for resizing
 * - Dispatches window resize events when dimensions change
 */
export const SandboxContainer: React.FC<SandboxContainerProps> = ({ onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { canvasWidth, canvasHeight, scale, setCanvasSize, syncWithCanvas } = useCanvas();

  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
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

  const handleMouseDown = useCallback((handle: ResizeHandle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartSize({ width: canvasWidth, height: canvasHeight });
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!isResizing || !resizeHandle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;

      let newWidth = startSize.width;
      let newHeight = startSize.height;

      // Calculate new canvas dimensions based on handle
      // Account for scale and devicePixelRatio
      const scaleFactor = scale * dpr;
      
      if (resizeHandle.includes('e')) {
        newWidth = startSize.width + (deltaX * dpr) / scale;
      }
      if (resizeHandle.includes('w')) {
        newWidth = startSize.width - (deltaX * dpr) / scale;
      }
      if (resizeHandle.includes('s')) {
        newHeight = startSize.height + (deltaY * dpr) / scale;
      }
      if (resizeHandle.includes('n')) {
        newHeight = startSize.height - (deltaY * dpr) / scale;
      }

      setCanvasSize(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
    };

    const handleMouseLeave = () => {
      // Stop resizing when mouse leaves the window
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isResizing, resizeHandle, startPos, startSize, scale, dpr, setCanvasSize]);

  // Resize handle component
  const ResizeHandleComponent = ({ 
    handle, 
    className 
  }: { 
    handle: ResizeHandle; 
    className: string;
  }) => (
    <div
      className={`absolute ${className} group`}
      onMouseDown={(e) => handleMouseDown(handle, e)}
      style={{ zIndex: 10 }}
    >
      <div className="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity bg-accent/20" />
    </div>
  );

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
        {/* Corners */}
        <ResizeHandleComponent 
          handle="nw" 
          className="top-0 left-0 w-3 h-3 cursor-nw-resize" 
        />
        <ResizeHandleComponent 
          handle="ne" 
          className="top-0 right-0 w-3 h-3 cursor-ne-resize" 
        />
        <ResizeHandleComponent 
          handle="sw" 
          className="bottom-0 left-0 w-3 h-3 cursor-sw-resize" 
        />
        <ResizeHandleComponent 
          handle="se" 
          className="bottom-0 right-0 w-3 h-3 cursor-se-resize" 
        />
        
        {/* Edges */}
        <ResizeHandleComponent 
          handle="n" 
          className="top-0 left-3 right-3 h-1 cursor-n-resize" 
        />
        <ResizeHandleComponent 
          handle="s" 
          className="bottom-0 left-3 right-3 h-1 cursor-s-resize" 
        />
        <ResizeHandleComponent 
          handle="w" 
          className="left-0 top-3 bottom-3 w-1 cursor-w-resize" 
        />
        <ResizeHandleComponent 
          handle="e" 
          className="right-0 top-3 bottom-3 w-1 cursor-e-resize" 
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
