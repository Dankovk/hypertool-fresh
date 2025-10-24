// Type imports
import type {
  HyperFrameRuntimeConfig,
  HyperFrameSandboxHandle,
  HyperFrameSandboxOptions,
} from './types';

// Implementation imports
import { HyperFrameRuntime } from './runtime';

// Runtime instance
const defaultConfig: HyperFrameRuntimeConfig = { mirrorCss: true };
const runtime = new HyperFrameRuntime(defaultConfig);

// Exports
export { runtime };

export function configureRuntime(config: HyperFrameRuntimeConfig) {
  return new HyperFrameRuntime(config);
}

export function createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle> {
  return runtime.createSandbox(options);
}



export function mirrorCss() {
  runtime.mirrorCss();
}

// Type exports - re-export all public types from types.ts
export type {
  // Core types
  HyperFrameRuntimeConfig,
  HyperFrameRuntimeApi,
  HyperFrameSandboxOptions,
  HyperFrameSandboxHandle,

  // Control types (re-exported from controls)
  ControlType,
  ControlDefinition,
  ControlDefinitions,
  NumberControlDefinition,
  ColorControlDefinition,
  BooleanControlDefinition,
  StringControlDefinition,
  SelectControlDefinition,

  // Sandbox types
  SandboxContext,
  SandboxEnvironment,
  SandboxControlsHandle,
  SandboxExportsApi,
  SandboxCaptureFn,
  SandboxCaptureResult,
  SandboxImageCaptureHandler,
  SandboxVideoCaptureHandler,
  SandboxControlChangeHandler,

  // Control panel types
  ControlChangePayload,
  ControlPanelOptions,

  // Mount types
  MountOptions,
  MountResult,


} from './types';
