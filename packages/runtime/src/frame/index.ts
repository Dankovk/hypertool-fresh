import { HyperFrameRuntime } from './runtime';
import type {
  HyperFrameRuntimeConfig,
  HyperFrameSandboxHandle,
  HyperFrameSandboxOptions,
} from './types';


const defaultConfig: HyperFrameRuntimeConfig = { mirrorCss: true };
const runtime = new HyperFrameRuntime(defaultConfig);

export { runtime };

export function configureRuntime(config: HyperFrameRuntimeConfig) {
  return new HyperFrameRuntime(config);
}

export function createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle> {
  return runtime.createSandbox(options);
}

export function ensureDependencies(options?: HyperFrameSandboxOptions['dependencies']) {
  return runtime.ensureDependencies(options ?? []);
}

export function mirrorCss() {
  runtime.mirrorCss();
}


export type { HyperFrameSandboxOptions, HyperFrameSandboxHandle };
