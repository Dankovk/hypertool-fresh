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

export function attachToWindow() {
  if (typeof window === 'undefined') {
    return;
  }

  const hyperWindow = window as unknown as { hyperFrame?: Record<string, any> };
  const existing = hyperWindow.hyperFrame || {};

  const api = {
    version: 'universal',
    runtime,
    createSandbox,
    ensureDependencies,
    mirrorCss,
  };

  hyperWindow.hyperFrame = { ...existing, ...api };
}

attachToWindow();

export type { HyperFrameSandboxOptions, HyperFrameSandboxHandle };
