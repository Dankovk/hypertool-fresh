import React from 'react';
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
  sandboxContainerRef,
  controls,
  exportWidget,
  container,
  exportsApi,
}) => {
  return (
    <div className="hyper-container ">
      {/* Main sandbox container */}
      <SandboxContainer containerRef={sandboxContainerRef} />

      {/* Controls panel (if configured) */}
      {controls && (
        <ControlsPanel
          definitions={controls.definitions}
          options={controls.options}
          onChange={controls.onChange}
        />
      )}

      {/* Export widget (if enabled) */}
      {exportWidget && exportWidget.enabled && (
        <ExportWidget
          container={container}
          position={exportWidget.position}
          filename={exportWidget.filename}
          exportsApi={exportsApi}
          useCanvasCapture={exportWidget.useCanvasCapture}
        />
      )}
    </div>
  );
};
