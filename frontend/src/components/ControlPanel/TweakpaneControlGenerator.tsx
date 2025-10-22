"use client";

import { useEffect, useRef } from "react";
import { Pane } from "tweakpane";

export interface ControlDefinition {
  type: 'color' | 'number' | 'boolean';
  label: string;
  value: any;
  min?: number;
  max?: number;
  step?: number;
}

export interface ControlDefinitions {
  [key: string]: ControlDefinition;
}

interface TweakpaneControlGeneratorProps {
  controlDefinitions: ControlDefinitions;
  onParameterChange: (key: string, value: any) => void;
  isIframeReady: boolean;
}

export function TweakpaneControlGenerator({ 
  controlDefinitions, 
  onParameterChange, 
  isIframeReady 
}: TweakpaneControlGeneratorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<Pane | null>(null);
  const paramsRef = useRef<Record<string, any>>({});
  const isUpdatingFromExternal = useRef(false);

  // Initialize Tweakpane
  useEffect(() => {
    if (!containerRef.current || !isIframeReady) return;

    console.log('Initializing Tweakpane controls with definitions:', controlDefinitions);

    // Clear existing content
    containerRef.current.innerHTML = '';

    // Create parameters object from control definitions
    const params: Record<string, any> = {};
    Object.entries(controlDefinitions).forEach(([key, definition]) => {
      params[key] = definition.value;
    });
    paramsRef.current = params;

    console.log('Creating Tweakpane pane with params:', params);

    try {
      // Create Tweakpane instance
      paneRef.current = new Pane({
        container: containerRef.current,
        title: "External Controls",
        expanded: true,
      });

      console.log('Tweakpane pane created successfully');

      // Add controls for each definition
      Object.entries(controlDefinitions).forEach(([key, definition]) => {
        console.log(`Adding Tweakpane control for ${key}:`, definition);
        
        try {
          let binding: any;

          switch (definition.type) {
            case 'color':
              binding = (paneRef.current as any).addBinding(params, key, {
                label: definition.label
              });
              break;

            case 'number':
              const numberConfig: any = {
                label: definition.label,
              };
              if (definition.min !== undefined) numberConfig.min = definition.min;
              if (definition.max !== undefined) numberConfig.max = definition.max;
              if (definition.step !== undefined) numberConfig.step = definition.step;
              
              binding = (paneRef.current as any).addBinding(params, key, numberConfig);
              break;

            case 'boolean':
              binding = (paneRef.current as any).addBinding(params, key, {
                label: definition.label,
              });
              break;

            default:
              console.warn(`Unknown control type: ${definition.type}`);
              return;
          }

          // Add change event listener
          binding.on('change', (ev: any) => {
            if (!isUpdatingFromExternal.current) {
              console.log(`Tweakpane control changed: ${key} = ${ev.value}`);
              onParameterChange(key, ev.value);
            }
          });

          console.log(`Tweakpane control added successfully for ${key}`);
        } catch (error) {
          console.error(`Error adding Tweakpane control for ${key}:`, error);
        }
      });

      console.log('All Tweakpane controls added successfully');
    } catch (error) {
      console.error('Error creating Tweakpane pane:', error);
    }

    return () => {
      if (paneRef.current) {
        paneRef.current.dispose();
        paneRef.current = null;
      }
    };
  }, [controlDefinitions, onParameterChange, isIframeReady]);

  // Update control values when definitions change (from iframe)
  useEffect(() => {
    if (!paneRef.current || !isIframeReady) return;

    // Set flag to prevent sending messages back
    isUpdatingFromExternal.current = true;

    Object.entries(controlDefinitions).forEach(([key, definition]) => {
      if (paramsRef.current.hasOwnProperty(key)) {
        paramsRef.current[key] = definition.value;
      }
    });

    // Refresh pane to show updated values
    if ((paneRef.current as any).refresh) {
      (paneRef.current as any).refresh();
    }

    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingFromExternal.current = false;
    }, 100);
  }, [controlDefinitions, isIframeReady]);

  return (
    <div className="tweakpane-external-controls">
      {!isIframeReady && (
        <div className="p-4 text-center text-text-secondary">
          <div className="text-sm">Waiting for iframe...</div>
        </div>
      )}
      {isIframeReady && Object.keys(controlDefinitions).length === 0 && (
        <div className="p-4 text-center text-text-secondary">
          <div className="text-sm">No control definitions received</div>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}