import type {
  ControlDefinitions,
  ControlPanelOptions,
  ControlChangePayload,
  SandboxContext,
  SandboxExportsApi,
} from '../types';

export interface WrapperAppProps {
  /**
   * Container element where the sandbox content will be mounted
   */
  sandboxContainerRef: React.RefObject<HTMLDivElement>;

  /**
   * Controls configuration
   */
  controls?: {
    definitions: ControlDefinitions;
    options?: ControlPanelOptions;
    onChange?: (change: ControlChangePayload) => void;
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

  /**
   * Reference to the sandbox container element (for export bridge to find canvas)
   */
  container: HTMLElement;

  /**
   * Exports API instance
   */
  exportsApi?: SandboxExportsApi;
}

export interface ControlsPanelProps {
  definitions: ControlDefinitions;
  options?: ControlPanelOptions;
  onChange?: (change: ControlChangePayload) => void;
  onReady?: (controls: any) => void;
}

export interface ExportWidgetProps {
  container: HTMLElement;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  filename?: string;
  exportsApi?: SandboxExportsApi;
  useCanvasCapture?: boolean;
}

export interface SandboxContainerProps {
  containerRef: React.RefObject<HTMLDivElement>;
}
