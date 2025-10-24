import React, { useState, useCallback } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { ExportWidget } from './components/ExportWidget';
import { SandboxContainer } from './components/SandboxContainer';
import { CanvasSizeWidget } from './components/CanvasSizeWidget';
import { CanvasProvider } from './context/CanvasContext';
import type { WrapperAppProps } from './types';
import './styles/controls.css';
import './styles/wrapper-app.css';

/**
 * WrapperApp - Main React app that wraps the sandbox
 *
 * This is the root component that manages the layout of the entire frame:
 * - CanvasProvider (context for canvas sizing)
 * - ExportWidget (UI + logic for capture/recording)
 * - CanvasSizeWidget (Canvas resize controls)
 * - Sandbox container (where user code renders, sized by CanvasContext)
 * - Controls panel (Tweakpane)
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
    <CanvasProvider>
      <div className="hyper-container flex flex-col items-center justify-center">
        {/* Export widget - handles UI + logic for capture/recording */}
        {exportWidget && exportWidget.enabled && (
          <ExportWidget
            getContainer={() => container}
            filename={exportWidget.filename}
            useCanvasCapture={exportWidget.useCanvasCapture}
          />
        )}

        {/* Canvas size controls */}
        <CanvasSizeWidget />

        {/* Main sandbox container - sized by CanvasContext */}
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
      </div>
    </CanvasProvider>
  );
};
