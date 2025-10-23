import type {
  ControlDefinitions,
  ControlPanelOptions,
  ControlChangePayload,
  SandboxContext,
  SandboxExportsApi,
} from '../types';

export interface WrapperAppProps {
  /**
   * Callback when the sandbox container is ready
   */
  onContainerReady: (container: HTMLElement) => void;

  /**
   * Controls configuration
   */
  controls?: {
    definitions: ControlDefinitions;
    options?: ControlPanelOptions;
    onChange?: (change: ControlChangePayload) => void;
    onReady?: (controls: any) => void;
  } | null;

  /**
   * Export widget configuration
   */
  exportWidget?: {
    enabled: boolean;
    filename?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    useCanvasCapture?: boolean;
  } | null;
}

export interface ControlsPanelProps {
  definitions: ControlDefinitions;
  options?: ControlPanelOptions;
  onChange?: (change: ControlChangePayload) => void;
  onReady?: (controls: any) => void;
}

export interface SandboxContainerProps {
  /**
   * Callback when the container is mounted and ready
   */
  onReady: (container: HTMLElement) => void;
}
