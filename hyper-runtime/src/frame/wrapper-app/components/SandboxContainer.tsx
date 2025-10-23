import React, { useCallback } from 'react';
import type { SandboxContainerProps } from '../types';

/**
 * SandboxContainer - Container component for user's sandbox content
 *
 * This component creates the sandbox container div directly in React
 * and notifies when it's ready with proper dimensions.
 */
export const SandboxContainer: React.FC<SandboxContainerProps> = ({ onReady }) => {
  // Use a callback ref to get notified when the div is mounted
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // The node is now in the DOM with proper dimensions
      onReady(node);
    }
  }, [onReady]);

  return (
    <div
      ref={containerRef}
      className="hyper-frame-sandbox-container"
      // style={{
      //   width: '100%',
      //   height: '100%',
      //   position: 'relative',
      //   overflow: 'hidden',
      // }}
    />
  );
};
