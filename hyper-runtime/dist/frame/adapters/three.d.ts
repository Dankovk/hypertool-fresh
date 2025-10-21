import type { HyperFrameRenderer, HyperFrameRendererSession, ControlDefinitions, ControlChangePayload } from '../types';
import { HyperFrameRuntime } from '../runtime';
import type { ResolveContainerOptions } from '../dom';
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
export interface MountThreeOptions extends ResolveContainerOptions {
    containerClassName?: string;
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
    onReady?: (context: ThreeContext) => void;
}
export interface MountThreeResult {
    container: HTMLElement;
    getContext(): ThreeContext | null;
    destroy(): void;
    startAnimation(): void;
    stopAnimation(): void;
    setHandlers(handlers: ThreeLifecycleHandlers): void;
}
export declare function mountThreeSketch(initialHandlers: ThreeLifecycleHandlers, options?: MountThreeOptions): MountThreeResult;
export interface ThreeControlPanelOptions {
    title?: string;
    position?: string;
    expanded?: boolean;
    container?: HTMLElement | string | null;
    onChange?: (change: ControlChangePayload, context: ThreeSketchContext) => void;
}
export interface RunThreeSketchOptions {
    controlDefinitions: ControlDefinitions;
    handlers: ThreeLifecycleHandlers;
    controls?: ThreeControlPanelOptions;
    mount?: MountThreeOptions;
    preconfiguredControls?: {
        params: Record<string, any>;
        controls: any;
    };
}
export interface RunThreeSketchResult {
    params: Record<string, any>;
    controls: any;
    context: ThreeSketchContext;
    threeContext: ThreeContext;
    destroy(): void;
    getInstance(): ThreeContext | null;
}
export declare function runThreeSketch(options: RunThreeSketchOptions): RunThreeSketchResult;
export interface StartThreeSketchOptions extends RunThreeSketchOptions {
    readiness?: {
        maxAttempts?: number;
    };
    metadata?: Record<string, unknown>;
}
export declare function startThreeSketchWithRuntime(runtime: HyperFrameRuntime, options: StartThreeSketchOptions): Promise<RunThreeSketchResult>;
interface ThreeRendererSession extends HyperFrameRendererSession {
}
export interface ThreeRendererOptions extends StartThreeSketchOptions {
    threeContextRef?: {
        current: ThreeContext | null;
    };
}
export declare function createThreeRenderer(): HyperFrameRenderer<ThreeRendererOptions, ThreeRendererSession>;
export {};
//# sourceMappingURL=three.d.ts.map