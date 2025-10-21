import { HyperFrameRuntime } from './runtime';
import { p5Adapter } from './adapters/p5';
import { threeAdapter } from './adapters/three';
import type { HyperFrameAdapter, HyperFrameStartOptions, MountOptions, MountResult, P5HandlerMap, P5Instance, P5SketchHandlers, RunP5SketchOptions, RunP5SketchResult, StartP5SketchOptions, RunThreeSketchOptions, RunThreeSketchResult, StartThreeSketchOptions, ThreeLifecycleHandlers, MountThreeOptions, ThreeContext } from './types';
declare const runtime: HyperFrameRuntime;
export { runtime, p5Adapter, threeAdapter };
export declare function registerAdapter(adapter: HyperFrameAdapter<any>): void;
export declare function start<Options>(options: HyperFrameStartOptions<Options>): Promise<import("./types").HyperFrameRuntimeHandle>;
export declare function ensureDependencies(dependencies?: HyperFrameStartOptions['dependencies']): Promise<void>;
export declare function mirrorCss(): void;
export declare function mountP5Sketch(handlers: P5HandlerMap, options?: MountOptions): Promise<MountResult<P5Instance>>;
export declare function runP5Sketch(options: RunP5SketchOptions): Promise<RunP5SketchResult>;
export declare function startP5Sketch(options: StartP5SketchOptions): Promise<RunP5SketchResult>;
export declare function runThreeSketch(options: RunThreeSketchOptions): Promise<RunThreeSketchResult>;
export declare function startThreeSketch(options: StartThreeSketchOptions): Promise<RunThreeSketchResult>;
export declare function mountThreeSketch(handlers: ThreeLifecycleHandlers, options?: MountThreeOptions): Promise<MountResult<ThreeContext>>;
export declare function attachToWindow(): void;
export type { P5Instance, P5SketchHandlers, P5HandlerMap, RunP5SketchOptions, RunP5SketchResult, StartP5SketchOptions, ThreeLifecycleHandlers, RunThreeSketchOptions, RunThreeSketchResult, StartThreeSketchOptions, MountResult, MountOptions, MountThreeOptions, ThreeContext, };
//# sourceMappingURL=index.d.ts.map