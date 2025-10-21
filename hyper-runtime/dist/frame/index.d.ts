import { HyperFrameRuntime } from './runtime';
import type { HyperFrameRuntimeConfig, HyperFrameSandboxHandle, HyperFrameSandboxOptions } from './types';
declare const runtime: HyperFrameRuntime;
export { runtime };
export declare function configureRuntime(config: HyperFrameRuntimeConfig): HyperFrameRuntime;
export declare function createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle>;
export declare function ensureDependencies(options?: HyperFrameSandboxOptions['dependencies']): Promise<void>;
export declare function mirrorCss(): void;
export declare function attachToWindow(): void;
export type { HyperFrameSandboxOptions, HyperFrameSandboxHandle };
//# sourceMappingURL=index.d.ts.map