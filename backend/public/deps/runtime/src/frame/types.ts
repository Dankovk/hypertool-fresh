import type { ExternalDependency } from './dependencyManager';

export type ControlType = 'number' | 'color' | 'boolean' | 'string' | 'select';

export interface BaseControlDefinition {
  label?: string;
  value: any;
}

export interface NumberControlDefinition extends BaseControlDefinition {
  type: 'number';
  value: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface ColorControlDefinition extends BaseControlDefinition {
  type: 'color';
  value: string;
}

export interface BooleanControlDefinition extends BaseControlDefinition {
  type: 'boolean';
  value: boolean;
}

export interface StringControlDefinition extends BaseControlDefinition {
  type: 'string';
  value: string;
}

export interface SelectControlDefinition extends BaseControlDefinition {
  type: 'select';
  value: string | number;
  options: Record<string, string | number> | Array<string | number>;
}

export type ControlDefinition =
  | NumberControlDefinition
  | ColorControlDefinition
  | BooleanControlDefinition
  | StringControlDefinition
  | SelectControlDefinition;

export type ControlDefinitions = Record<string, ControlDefinition>;

export interface ControlChangePayload {
  key: string;
  value: any;
  event: any;
}

export interface ControlPanelOptions {
  title?: string;
  position?: string;
  expanded?: boolean;
  container?: HTMLElement | string | null;
  onChange?: (change: ControlChangePayload, context: SandboxContext) => void;
}

export interface MountOptions {
  target?: HTMLElement | string | null;
  containerClassName?: string;
  onReady?: (context: { container: HTMLElement }) => void;
}

export interface SandboxControlsHandle {
  params: Record<string, any>;
  destroy?(): void;
  dispose?(): void;
  [key: string]: any;
}

export type SandboxControlChangeHandler = (change: ControlChangePayload, context: SandboxContext) => void;

export type SandboxCaptureResult = Blob | string | HTMLCanvasElement | OffscreenCanvas | null;

export type SandboxCaptureFn = () => Promise<SandboxCaptureResult> | SandboxCaptureResult;

export interface SandboxImageCaptureHandler {
  capture: SandboxCaptureFn;
  filename?: string;
  mimeType?: string;
}

export interface SandboxVideoCaptureHandler {
  requestStream: () => Promise<MediaStream> | MediaStream;
  filename?: string;
  mimeType?: string;
  bitsPerSecond?: number;
  timeSlice?: number;
}

export interface SandboxExportsApi {
  registerImageCapture(handler: SandboxImageCaptureHandler | SandboxCaptureFn | null): void;
  registerVideoCapture(handler: SandboxVideoCaptureHandler | null): void;
  setFilename(filename: string): void;
  setVisible(visible: boolean): void;
  useDefaultCanvasCapture(enable?: boolean): void;
  destroy(): void;
}

export interface SandboxEnvironment {
  window: Window;
  document: Document;
  addCleanup(cleanup: () => void): void;
  onResize(handler: () => void, options?: AddEventListenerOptions): () => void;
}

export interface SandboxContext {
  mount: HTMLElement;
  params: Record<string, any>;
  controls: SandboxControlsHandle | null;
  exports: SandboxExportsApi;
  runtime: HyperFrameRuntimeApi;
  environment: SandboxEnvironment;
}

export interface MountResult<TInstance = any> {
  container: HTMLElement;
  getInstance(): TInstance | null;
  destroy(): void;
}

export interface HyperFrameSandboxHandle {
  destroy(): void;
  container: HTMLElement;
  controls: SandboxControlsHandle | null;
  params: Record<string, any>;
}

export interface HyperFrameRuntimeConfig {
  mirrorCss?: boolean;
}

export interface HyperFrameSandboxOptions {
  name?: string;
  dependencies?: ExternalDependency[];
  mirrorCss?: boolean;
  mount?: MountOptions | Record<string, any>;
  controls?: {
    definitions: ControlDefinitions;
    options?: ControlPanelOptions;
    onChange?: SandboxControlChangeHandler;
  };
  exportWidget?: {
    enabled?: boolean;
    filename?: string;
    useCanvasCapture?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  setup(context: SandboxContext): Promise<void | (() => void)> | void | (() => void);
}

export interface HyperFrameRuntimeApi {
  ensureDependencies(dependencies?: ExternalDependency[]): Promise<void>;
  mirrorCss(): void;
  createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle>;
}

export type { ExternalDependency };
