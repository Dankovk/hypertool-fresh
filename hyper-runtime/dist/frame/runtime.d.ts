import type { HyperFrameAdapter, HyperFrameRuntimeApi, HyperFrameRuntimeHandle, HyperFrameStartOptions } from './types';
export interface HyperFrameRuntimeConfig {
    mirrorCss?: boolean;
    exportWidget?: boolean;
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
    private createControls;
}
//# sourceMappingURL=runtime.d.ts.map