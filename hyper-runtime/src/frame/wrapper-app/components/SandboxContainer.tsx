import React, { useRef, useEffect } from 'react';
import { useCanvas } from '../context/CanvasContext';
import type { SandboxContainerProps } from '../types';

/**
 * SandboxContainer - Container for the user's canvas/sketch
 *
 * This is where the user's code will render (p5.js, Three.js, etc.)
 * Size is controlled by CanvasContext.
 * 
 * Dispatches window resize events when dimensions change to notify
 * user code that the canvas size has changed.
 */
export const SandboxContainer: React.FC<SandboxContainerProps> = ({ onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useCanvas();

  useEffect(() => {
    if (containerRef.current) {
      onReady(containerRef.current);
    }
  }, [onReady]);

  // Dispatch window resize event when canvas dimensions change
  useEffect(() => {
    // Dispatch resize event to notify user code (p5.js, Three.js, etc.)
    // This is what the runtime's onResize handler listens to
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);
    
    console.log('[SandboxContainer] Dispatched resize event:', { width, height });
  }, [width, height]);

  return (
    <div className="hyper-frame-sandbox-wrapper absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        ref={containerRef}
        className="hyper-frame-sandbox-container pointer-events-auto"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
    </div>
  );
};
