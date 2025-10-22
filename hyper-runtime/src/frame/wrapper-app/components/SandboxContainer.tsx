import React from 'react';
import type { SandboxContainerProps } from '../types';

/**
 * SandboxContainer - Container component for user's sandbox content
 *
 * This component provides the mount point where the user's code
 * will render its content (canvas, DOM elements, etc.)
 */
export const SandboxContainer: React.FC<SandboxContainerProps> = ({ containerRef }) => {
  return (
    <div
      ref={containerRef}
      className="hyper-frame-sandbox-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
};
