import { ExternalDependency } from './dependencyManager';
import { HyperFrameRuntimeApi, HyperFrameRuntimeConfig, HyperFrameSandboxHandle, HyperFrameSandboxOptions } from './types';
export declare class HyperFrameRuntime implements HyperFrameRuntimeApi {
    private dependencyManager;
    private cssBridge;
    private config;
    constructor(config?: HyperFrameRuntimeConfig);
    ensureDependencies(dependencies?: ExternalDependency[]): Promise<void>;
    mirrorCss(): void;
    createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle>;
    private createEnvironment;
    private createMount;
}
//# sourceMappingURL=runtime.d.ts.map