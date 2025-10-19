export type P5Instance = any;
export type P5Handler = (instance: P5Instance, ...args: any[]) => void;
export type P5HandlerMap = Record<string, P5Handler | undefined>;
export interface MountOptions {
    /**
     * Target element or selector to mount into.
     * When omitted, a container div will be created and appended to body.
     */
    target?: HTMLElement | string | null;
    /**
     * Class name to apply to the container.
     * Defaults to `hypertool-sketch`.
     */
    containerClassName?: string;
    /**
     * Called when the p5 instance has been created.
     */
    onReady?: (context: {
        p5: P5Instance;
        container: HTMLElement;
    }) => void;
}
export interface MountResult {
    /**
     * Root container element used by p5.
     */
    container: HTMLElement;
    /**
     * Retrieve the active p5 instance, if available.
     */
    getInstance(): P5Instance | null;
    /**
     * Replace lifecycle handlers with new implementations.
     * Existing p5 event bindings are refreshed immediately.
     */
    setHandlers(handlers: P5HandlerMap): void;
    /**
     * Dispose of the p5 sketch and remove the container if it was created automatically.
     */
    destroy(): void;
}
/**
 * Mount a p5 sketch with the provided lifecycle handlers.
 */
export declare function mountP5Sketch(initialHandlers: P5HandlerMap, options?: MountOptions): MountResult;
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
export type ControlDefinition = NumberControlDefinition | ColorControlDefinition | BooleanControlDefinition | StringControlDefinition | SelectControlDefinition;
export type ControlDefinitions = Record<string, ControlDefinition>;
export interface ControlChangePayload {
    key: string;
    value: any;
    event: any;
}
export interface P5SketchContext {
    params: Record<string, any>;
    controls: any;
    getP5Instance(): P5Instance | null;
}
export type P5SketchHandler = (p5: P5Instance, context: P5SketchContext, ...args: any[]) => void;
export type P5SketchHandlers = Record<string, P5SketchHandler | undefined>;
export interface ControlPanelOptions {
    title?: string;
    position?: string;
    expanded?: boolean;
    container?: HTMLElement | string | null;
    onChange?: (change: ControlChangePayload, context: P5SketchContext) => void;
}
export interface RunP5SketchOptions {
    controlDefinitions: ControlDefinitions;
    handlers: P5SketchHandlers;
    controls?: ControlPanelOptions;
    mount?: MountOptions;
}
export interface RunP5SketchResult {
    params: Record<string, any>;
    controls: any;
    context: P5SketchContext;
    destroy(): void;
    setHandlers(handlers: P5SketchHandlers): void;
    getInstance(): P5Instance | null;
}
/**
 * High level helper that wires up controls-lib and p5 mounting in one call.
 */
export declare function runP5Sketch(options: RunP5SketchOptions): RunP5SketchResult;
export interface StartP5SketchOptions extends RunP5SketchOptions {
    p5?: {
        url?: string;
        maxAttempts?: number;
    };
    readiness?: {
        maxAttempts?: number;
    };
}
/**
 * Bootstrap a p5 sketch by ensuring p5 and the controls library are ready.
 */
export declare function startP5Sketch(options: StartP5SketchOptions): Promise<RunP5SketchResult>;
