"use client";

import { useEffect } from "react";
import { TweakpaneControlGenerator, type ControlDefinitions } from "./TweakpaneControlGenerator";

interface ControlPanelProps {
  files: Record<string, string>;
  onParameterChange?: (key: string, value: any) => void;
  isIframeReady?: boolean;
  controlDefinitions?: ControlDefinitions;
}

export function ControlPanel({ files, onParameterChange, isIframeReady, controlDefinitions }: ControlPanelProps) {

  // Log when iframe ready state changes
  useEffect(() => {
    if (isIframeReady) {
      console.log('ControlPanel iframe ready state:', isIframeReady);
    }
  }, [isIframeReady]);

  // Log when control definitions change
  useEffect(() => {
    if (controlDefinitions && Object.keys(controlDefinitions).length > 0) {
      console.log('ControlPanel received control definitions:', controlDefinitions);
    }
  }, [controlDefinitions]);

  return (
    <div className="flex h-full w-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
      <div className="border-b border-border bg-accent/5 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight text-accent">Controls</div>
          {isIframeReady && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Connected
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {/* External Tweakpane Controls */}
        {controlDefinitions && Object.keys(controlDefinitions).length > 0 ? (
          <TweakpaneControlGenerator
            controlDefinitions={controlDefinitions}
            onParameterChange={onParameterChange || (() => {})}
            isIframeReady={isIframeReady || false}
          />
        ) : (
          <div className="p-4 text-center text-text-secondary">
            <div className="text-sm">
              {isIframeReady ? 'No controls available' : 'Waiting for iframe...'}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}