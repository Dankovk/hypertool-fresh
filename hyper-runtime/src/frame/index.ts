import { HyperFrameRuntime } from './runtime';
import { p5Adapter } from './adapters/p5';
import { threeAdapter } from './adapters/three';
import type {
  HyperFrameAdapter,
  HyperFrameStartOptions,
  MountOptions,
  MountResult,
  P5HandlerMap,
  P5Instance,
  P5SketchHandlers,
  RunP5SketchOptions,
  RunP5SketchResult,
  StartP5SketchOptions,
  RunThreeSketchOptions,
  RunThreeSketchResult,
  StartThreeSketchOptions,
  ThreeLifecycleHandlers,
  MountThreeOptions,
  ThreeContext,
} from './types';

const runtime = new HyperFrameRuntime({ mirrorCss: true });

runtime.registerAdapter(p5Adapter);
runtime.registerAdapter(threeAdapter);

export { runtime, p5Adapter, threeAdapter };

export function registerAdapter(adapter: HyperFrameAdapter<any>) {
  runtime.registerAdapter(adapter);
}

export function start<Options>(options: HyperFrameStartOptions<Options>) {
  return runtime.start(options);
}

export function ensureDependencies(dependencies?: HyperFrameStartOptions['dependencies']) {
  return runtime.ensureDependencies(dependencies);
}

export function mirrorCss() {
  runtime.mirrorCss();
}

export function mountP5Sketch(handlers: P5HandlerMap, options?: MountOptions): Promise<MountResult<P5Instance>> {
  return runtime.mountP5Sketch(handlers, options);
}

export function runP5Sketch(options: RunP5SketchOptions): Promise<RunP5SketchResult> {
  return runtime.runP5Sketch(options);
}

export function startP5Sketch(options: StartP5SketchOptions): Promise<RunP5SketchResult> {
  return runtime.startP5Sketch(options);
}

export function runThreeSketch(options: RunThreeSketchOptions): Promise<RunThreeSketchResult> {
  return runtime.runThreeSketch(options);
}

export function startThreeSketch(options: StartThreeSketchOptions): Promise<RunThreeSketchResult> {
  return runtime.startThreeSketch(options);
}

export function mountThreeSketch(
  handlers: ThreeLifecycleHandlers,
  options?: MountThreeOptions,
): Promise<MountResult<ThreeContext>> {
  return runtime.mountThreeSketch(handlers, options);
}

export function attachToWindow() {
  if (typeof window === 'undefined') {
    return;
  }

  const hyperWindow = window as unknown as {
    hyperFrame?: any;
  };

  const api = {
    version: 'next',
    runtime,
    registerAdapter,
    ensureDependencies,
    mirrorCss,
    start,
    p5: {
      mount: mountP5Sketch,
      run: runP5Sketch,
      start: startP5Sketch,
    },
    three: {
      mount: mountThreeSketch,
      run: runThreeSketch,
      start: startThreeSketch,
    },
  };

  hyperWindow.hyperFrame = { ...(hyperWindow.hyperFrame || {}), ...api };
}

attachToWindow();

export type {
  P5Instance,
  P5SketchHandlers,
  P5HandlerMap,
  RunP5SketchOptions,
  RunP5SketchResult,
  StartP5SketchOptions,
  ThreeLifecycleHandlers,
  RunThreeSketchOptions,
  RunThreeSketchResult,
  StartThreeSketchOptions,
  MountResult,
  MountOptions,
  MountThreeOptions,
  ThreeContext,
};
