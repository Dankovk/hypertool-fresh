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

export interface HyperFrameControlContext {
  params: Record<string, any>;
  controls: any;
  getInstance(): any;
}

export interface ControlPanelOptions {
  title?: string;
  position?: string;
  expanded?: boolean;
  container?: HTMLElement | string | null;
  onChange?: (change: ControlChangePayload, context: HyperFrameControlContext) => void;
}

export interface MountOptions {
  target?: HTMLElement | string | null;
  containerClassName?: string;
  onReady?: (context: { container: HTMLElement }) => void;
}

export interface RuntimeLifecycleHandle {
  destroy(): void;
}

export interface RuntimeInstanceHandle extends RuntimeLifecycleHandle {
  getInstance?(): any;
  setHandlers?(handlers: Record<string, any>): void;
}

export interface MountResult<TInstance = any> {
  container: HTMLElement;
  getInstance(): TInstance | null;
  setHandlers(handlers: Record<string, any>): void;
  destroy(): void;
}

export interface HyperFrameExportStartOptions {
  mimeType?: string;
  bitsPerSecond?: number;
  frameRate?: number;
}

export interface HyperFrameExportProvider {
  captureFrame?(): Promise<Blob | string> | Blob | string;
  startRecording?(options?: HyperFrameExportStartOptions): Promise<void> | void;
  stopRecording?(): Promise<Blob | string | null> | Blob | string | null;
  isRecording?(): boolean;
}

export interface ExportWidgetImageOptions {
  enabled?: boolean;
  fileName?: string;
}

export interface ExportWidgetVideoOptions {
  enabled?: boolean;
  fileName?: string;
  mimeType?: string;
  bitsPerSecond?: number;
  frameRate?: number;
}

export type ExportWidgetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ExportWidgetOptions {
  position?: ExportWidgetPosition;
  image?: ExportWidgetImageOptions;
  video?: ExportWidgetVideoOptions;
  autoDownload?: boolean;
}

export interface ExportWidgetHandle {
  captureImage(): Promise<Blob | null>;
  startRecording(): Promise<Blob | null>;
  stopRecording(): Promise<Blob | null>;
  isRecording(): boolean;
  destroy(): void;
}

export interface HyperFrameAdapterContext {
  mount: {
    container: HTMLElement;
    destroy(): void;
  };
  controls: any;
  params: Record<string, any>;
  runtime: HyperFrameRuntimeApi;
  mountOptions?: any;
  registerExportProvider?(provider: HyperFrameExportProvider | null): void;
}

export interface HyperFrameAdapterHandle {
  destroy(): void;
  setHandlers?(handlers: Record<string, any>): void;
  getInstance?(): any;
  exports?: HyperFrameExportProvider | null;
}

export interface HyperFrameRuntimeHandle extends HyperFrameAdapterHandle {
  params: Record<string, any>;
  controls: any;
  container: HTMLElement;
  exporter: ExportWidgetHandle | null;
}

export interface HyperFrameAdapter<Options = any> {
  id: string;
  ensure?(options: Options, context: HyperFrameRuntimeApi): Promise<void> | void;
  start(
    options: Options,
    context: HyperFrameAdapterContext,
  ): Promise<HyperFrameAdapterHandle> | HyperFrameAdapterHandle;
}

export type ExternalDependencyType = 'script' | 'style';

export interface HyperFrameDependencyDescriptor {
  type: ExternalDependencyType;
  url: string;
  attributes?: Record<string, string>;
  integrity?: string;
  crossOrigin?: string;
}

export interface HyperFrameStartOptions<Options = any> {
  adapter: string | HyperFrameAdapter<Options>;
  options: Options;
  controlDefinitions?: ControlDefinitions;
  controls?: ControlPanelOptions;
  mount?: MountOptions | Record<string, any>;
  dependencies?: HyperFrameDependencyDescriptor[];
  mirrorCss?: boolean;
  exporter?: ExportWidgetOptions | false;
}

export interface HyperFrameRuntimeApi {
  ensureDependencies(dependencies?: HyperFrameDependencyDescriptor[]): Promise<void>;
  mirrorCss(): void;
  registerAdapter(adapter: HyperFrameAdapter<any>): void;
  start<Options>(options: HyperFrameStartOptions<Options>): Promise<HyperFrameRuntimeHandle>;
}
