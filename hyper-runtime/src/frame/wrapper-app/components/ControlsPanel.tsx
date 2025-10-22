import React, { useEffect, useRef } from 'react';
import type { ControlsPanelProps } from '../types';

/**
 * ControlsPanel - React wrapper for Tweakpane controls
 *
 * This component creates a container for the existing HypertoolControls
 * (Tweakpane) to mount into. It manages the lifecycle of the controls
 * and forwards all changes to the parent component.
 */
export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  definitions,
  options,
  onChange,
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Access the global hypertoolControls API
    const hyperWindow = window as any;
    if (!hyperWindow.hypertoolControls) {
      console.warn('[ControlsPanel] hypertoolControls not available on window');
      return;
    }

    // Create the control panel
    try {
      const controls = hyperWindow.hypertoolControls.createControlPanel(definitions, {
        title: options?.title,
        position: options?.position,
        expanded: options?.expanded,
        container: containerRef.current,
        onChange: (params: Record<string, any>, context: any) => {
          if (onChange) {
            onChange({
              key: context.key,
              value: context.value,
              event: context.event,
            });
          }
        },
      });

      controlsRef.current = controls;
      onReady?.(controls);
    } catch (error) {
      console.error('[ControlsPanel] Failed to create controls:', error);
    }

    // Cleanup
    return () => {
      if (controlsRef.current) {
        if (typeof controlsRef.current.dispose === 'function') {
          controlsRef.current.dispose();
        } else if (typeof controlsRef.current.destroy === 'function') {
          controlsRef.current.destroy();
        }
        controlsRef.current = null;
      }
    };
  }, [definitions, options, onChange, onReady]);

  return (
    <div
      ref={containerRef}
      className="hyper-frame-controls-panel"
      style={{
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    />
  );
};
