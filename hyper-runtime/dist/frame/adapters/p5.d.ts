import type { HyperFrameRenderer, HyperFrameRendererSession, ControlDefinitions, ControlChangePayload } from '../types';
import { HyperFrameRuntime } from '../runtime';
import type { ResolveContainerOptions } from '../dom';
export type P5Instance = any;
export type P5Handler = (instance: P5Instance, ...args: any[]) => void;
export type P5HandlerMap = Record<string, P5Handler | undefined>;
export interface MountOptions extends ResolveContainerOptions {
    containerClassName?: string;
    onReady?: (context: {
        p5: P5Instance;
        container: HTMLElement;
    }) => void;
}
export interface MountResult {
    container: HTMLElement;
    getInstance(): P5Instance | null;
    setHandlers(handlers: P5HandlerMap): void;
    destroy(): void;
}
type P5Constructor = new (sketch: (p5: P5Instance) => void, node?: HTMLElement) => P5Instance;
declare global {
    interface Window {
        p5?: P5Constructor;
    }
}
export declare function mountP5Sketch(initialHandlers: P5HandlerMap, options?: MountOptions): MountResult;
export interface P5ControlPanelOptions {
    title?: string;
    position?: string;
    expanded?: boolean;
    container?: HTMLElement | string | null;
    onChange?: (change: ControlChangePayload, context: P5SketchContext) => void;
}
export interface P5SketchContext {
    params: Record<string, any>;
    controls: any;
    getP5Instance(): P5Instance | null;
}
export type P5SketchHandler = (p5: P5Instance, context: P5SketchContext, ...args: any[]) => void;
export type P5SketchHandlers = Record<string, P5SketchHandler | undefined>;
export interface RunP5SketchOptions {
    controlDefinitions: ControlDefinitions;
    handlers: P5SketchHandlers;
    controls?: P5ControlPanelOptions;
    mount?: MountOptions;
    preconfiguredControls?: {
        params: Record<string, any>;
        controls: any;
    };
}
export interface RunP5SketchResult {
    params: Record<string, any>;
    controls: any;
    context: P5SketchContext;
    destroy(): void;
    setHandlers(handlers: P5SketchHandlers): void;
    getInstance(): P5Instance | null;
}
export declare function runP5Sketch(options: RunP5SketchOptions): RunP5SketchResult;
export interface StartP5SketchOptions extends RunP5SketchOptions {
    p5?: {
        url?: string;
        maxAttempts?: number;
    };
    readiness?: {
        maxAttempts?: number;
    };
    metadata?: Record<string, unknown>;
}
export interface RunP5SketchResultWithInstance extends RunP5SketchResult {
    setHandlers(handlers: P5SketchHandlers): void;
    getInstance(): P5Instance | null;
}
export declare function startP5SketchWithRuntime(runtime: HyperFrameRuntime, options: StartP5SketchOptions): Promise<RunP5SketchResultWithInstance>;
export interface P5RendererSession extends HyperFrameRendererSession {
    setHandlers(handlers: P5SketchHandlers): void;
}
export interface P5RendererOptions extends StartP5SketchOptions {
    instanceRef?: {
        current: P5Instance | null;
    };
}
export declare function createP5Renderer(): HyperFrameRenderer<P5RendererOptions, P5RendererSession>;
export {};
//# sourceMappingURL=p5.d.ts.map