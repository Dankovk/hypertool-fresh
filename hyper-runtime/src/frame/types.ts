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
  onChange?: (change: ControlChangePayload, context: P5SketchContext) => void;
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

export interface HyperFrameAdapterContext {
  mount: {
    container: HTMLElement;
    destroy(): void;
  };
  controls: any;
  params: Record<string, any>;
  runtime: HyperFrameRuntimeApi;
  mountOptions?: any;
}

export interface HyperFrameAdapterHandle {
  destroy(): void;
  setHandlers?(handlers: Record<string, any>): void;
  getInstance?(): any;
}

export interface HyperFrameRuntimeHandle extends HyperFrameAdapterHandle {
  params: Record<string, any>;
  controls: any;
  container: HTMLElement;
}

export interface HyperFrameAdapter<Options = any> {
  id: string;
  ensure?(options: Options, context: HyperFrameRuntimeApi): Promise<void> | void;
  start(options: Options, context: HyperFrameAdapterContext): Promise<HyperFrameAdapterHandle> | HyperFrameAdapterHandle;
}

export interface HyperFrameStartOptions<Options = any> {
  adapter: string | HyperFrameAdapter<Options>;
  options: Options;
  controlDefinitions?: ControlDefinitions;
  controls?: ControlPanelOptions;
  mount?: MountOptions | Record<string, any>;
  dependencies?: Array<{
    type: 'script' | 'style';
    url: string;
    attributes?: Record<string, string>;
    integrity?: string;
    crossOrigin?: string;
  }>;
  mirrorCss?: boolean;
}

export interface HyperFrameRuntimeApi {
  ensureDependencies(dependencies?: HyperFrameStartOptions['dependencies']): Promise<void>;
  mirrorCss(): void;
}

export interface P5Instance {
  remove(): void;
  [key: string]: any;
}

export type P5Handler = (instance: P5Instance, ...args: any[]) => void;

export type P5HandlerMap = Record<string, P5Handler | undefined>;

export interface P5SketchContext {
  params: Record<string, any>;
  controls: any;
  getInstance(): P5Instance | null;
  getP5Instance(): P5Instance | null;
}

export type P5SketchHandler = (p5: P5Instance, context: P5SketchContext, ...args: any[]) => void;

export type P5SketchHandlers = Record<string, P5SketchHandler | undefined>;

export interface RunP5SketchOptions {
  controlDefinitions: ControlDefinitions;
  handlers: P5SketchHandlers;
  controls?: ControlPanelOptions;
  mount?: MountOptions;
  dependencies?: HyperFrameStartOptions['dependencies'];
  mirrorCss?: boolean;
}

export interface RunP5SketchResult {
  params: Record<string, any>;
  controls: any;
  context: P5SketchContext;
  destroy(): void;
  setHandlers(handlers: P5SketchHandlers): void;
  getInstance(): P5Instance | null;
}

export interface StartP5SketchOptions extends RunP5SketchOptions {
  p5?: {
    url?: string;
  };
}

export type ThreeInstance = any;

export interface ThreeContext {
  scene: any;
  camera: any;
  renderer: any;
  controls?: any;
}

export interface ThreeSketchContext {
  params: Record<string, any>;
  controls: any;
  getThreeContext(): ThreeContext | null;
}

export type ThreeSketchHandler = (three: ThreeContext, context: ThreeSketchContext, ...args: any[]) => void;

export interface ThreeLifecycleHandlers {
  setup?: ThreeSketchHandler;
  animate?: ThreeSketchHandler;
  resize?: ThreeSketchHandler;
  dispose?: () => void;
}

export interface MountThreeOptions extends MountOptions {
  camera?: {
    type?: 'perspective' | 'orthographic';
    fov?: number;
    near?: number;
    far?: number;
    position?: [number, number, number];
  };
  renderer?: {
    antialias?: boolean;
    alpha?: boolean;
    preserveDrawingBuffer?: boolean;
  };
  orbitControls?: boolean;
}

export interface RunThreeSketchOptions {
  handlers: ThreeLifecycleHandlers;
  controlDefinitions?: ControlDefinitions;
  controls?: ControlPanelOptions;
  mount?: MountThreeOptions;
  dependencies?: HyperFrameStartOptions['dependencies'];
  mirrorCss?: boolean;
}

export interface RunThreeSketchResult {
  params: Record<string, any>;
  controls: any;
  context: ThreeSketchContext;
  destroy(): void;
  setHandlers(handlers: ThreeLifecycleHandlers): void;
  getContext(): ThreeContext | null;
}

export interface StartThreeSketchOptions extends RunThreeSketchOptions {
  three?: {
    url?: string;
  };
}
