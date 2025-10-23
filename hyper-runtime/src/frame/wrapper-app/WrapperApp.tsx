import React, { useState, useCallback } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { ExportWidget } from './components/ExportWidget';
import { SandboxContainer } from './components/SandboxContainer';
import type { WrapperAppProps } from './types';
import './styles/wrapper-app.css';

/**
 * WrapperApp - Main React app that wraps the sandbox
 *
 * This is the root component that manages the layout of the entire frame:
 * - Sandbox container (where user code renders)
 * - Controls panel (Tweakpane)
 * - Export widget (capture/recording buttons)
 */
export const WrapperApp: React.FC<WrapperAppProps> = ({
  onContainerReady,
  controls,
  exportWidget,
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const handleContainerReady = useCallback((node: HTMLElement) => {
    setContainer(node);
    onContainerReady(node);
  }, [onContainerReady]);

  return (
    <>
      {/* Main sandbox container */}
      <SandboxContainer onReady={handleContainerReady} />

      {/* Controls panel (if configured) */}
      {controls && (
        <ControlsPanel
          definitions={controls.definitions}
          options={controls.options}
          onChange={controls.onChange}
          onReady={controls.onReady}
        />
      )}

      {/* Export widget (if enabled) */}
      {exportWidget && exportWidget.enabled && (
        <ExportWidget
          getContainer={() => container}
          position={exportWidget.position}
          filename={exportWidget.filename}
          useCanvasCapture={exportWidget.useCanvasCapture}
        />
      )}
    </>
  );
};
