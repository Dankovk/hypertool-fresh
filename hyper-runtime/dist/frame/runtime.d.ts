import type { HyperFrameAdapter, HyperFrameRuntimeHandle, HyperFrameRuntimeApi, HyperFrameStartOptions, MountOptions, MountResult, RunP5SketchOptions, RunP5SketchResult, RunThreeSketchOptions, RunThreeSketchResult, StartP5SketchOptions, StartThreeSketchOptions, P5HandlerMap, ThreeLifecycleHandlers, P5Instance, MountThreeOptions, ThreeContext } from './types';
export interface HyperFrameRuntimeConfig {
    mirrorCss?: boolean;
}
export declare class HyperFrameRuntime implements HyperFrameRuntimeApi {
    private adapters;
    private dependencyManager;
    private cssBridge;
    private config;
    constructor(config?: HyperFrameRuntimeConfig);
    registerAdapter(adapter: HyperFrameAdapter<any>): void;
    ensureDependencies(dependencies?: HyperFrameStartOptions['dependencies']): Promise<void>;
    mirrorCss(): void;
    start<Options = any>(options: HyperFrameStartOptions<Options>): Promise<HyperFrameRuntimeHandle>;
    private resolveAdapter;
    private createMount;
    runP5Sketch(options: RunP5SketchOptions): Promise<RunP5SketchResult>;
    startP5Sketch(options: StartP5SketchOptions): Promise<RunP5SketchResult>;
    mountP5Sketch(handlers: P5HandlerMap, mount?: MountOptions): Promise<MountResult<P5Instance>>;
    runThreeSketch(options: RunThreeSketchOptions): Promise<RunThreeSketchResult>;
    startThreeSketch(options: StartThreeSketchOptions): Promise<RunThreeSketchResult>;
    mountThreeSketch(handlers: ThreeLifecycleHandlers, mount?: MountThreeOptions): Promise<MountResult<ThreeContext>>;
}
//# sourceMappingURL=runtime.d.ts.map