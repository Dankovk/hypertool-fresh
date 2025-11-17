import React, { useState, useEffect, useCallback } from 'react';

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ResizeHandlesProps {
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  onResize: (width: number, height: number) => void;
}

/**
 * ResizeHandles - Drag handles for resizing the canvas container
 * 
 * Provides 8 resize handles with complete resize logic:
 * - 4 corners: nw, ne, sw, se
 * - 4 edges: n, s, e, w
 * 
 * Handles all mouse events and dimension calculations internally.
 */
export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ 
  canvasWidth, 
  canvasHeight, 
  scale, 
  onResize 
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });

  const dpr = window.devicePixelRatio || 1;

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
      const safeScale = 1;

      let newWidth = startSize.width;
      let newHeight = startSize.height;

      // Calculate new canvas dimensions based on handle
      // Account for scale and devicePixelRatio
      if (resizeHandle.includes('e')) {
        newWidth = startSize.width + (deltaX * dpr) / safeScale;
      }
      if (resizeHandle.includes('w')) {
        newWidth = startSize.width - (deltaX * dpr) / safeScale;
      }
      if (resizeHandle.includes('s')) {
        newHeight = startSize.height + (deltaY * dpr) / safeScale;
      }
      if (resizeHandle.includes('n')) {
        newHeight = startSize.height - (deltaY * dpr) / safeScale;
      }

      onResize(newWidth, newHeight);
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
  }, [isResizing, resizeHandle, startPos, startSize, scale, dpr, onResize]);

  // Individual resize handle component
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
    <>
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
    </>
  );
};

