import type { HyperFrameStartOptions, HyperFrameSession } from './types';
import { createHyperFrameRuntime, HyperFrameRuntime } from './runtime';
import { ParentStyleMirror, syncParentStyles } from './styleSync';

import {
  mountP5Sketch,
  runP5Sketch,
  startP5SketchWithRuntime,
  createP5Renderer,
  type StartP5SketchOptions,
  type RunP5SketchOptions,
  type RunP5SketchResultWithInstance,
  type P5RendererOptions,
  type P5RendererSession,
  type P5Instance,
  type P5SketchContext,
  type P5SketchHandlers,
  type P5ControlPanelOptions,
  type MountOptions,
  type MountResult,
} from './adapters/p5';

import {
  mountThreeSketch,
  runThreeSketch,
  startThreeSketchWithRuntime,
  createThreeRenderer,
  type StartThreeSketchOptions,
  type RunThreeSketchOptions,
  type RunThreeSketchResult,
  type ThreeRendererOptions,
  type ThreeInstance,
  type ThreeContext,
  type ThreeSketchContext,
  type ThreeLifecycleHandlers,
  type ThreeControlPanelOptions,
  type MountThreeOptions,
  type MountThreeResult,
} from './adapters/three';

export * from './types';
export { ParentStyleMirror, syncParentStyles };
export {
  mountP5Sketch,
  runP5Sketch,
  startP5SketchWithRuntime,
  createP5Renderer,
};
export {
  mountThreeSketch,
  runThreeSketch,
  startThreeSketchWithRuntime,
  createThreeRenderer,
};

export type {
  StartP5SketchOptions,
  RunP5SketchOptions,
  RunP5SketchResultWithInstance,
  P5RendererOptions,
  P5RendererSession,
  P5Instance,
  P5SketchContext,
  P5SketchHandlers,
  P5ControlPanelOptions,
  MountOptions,
  MountResult,
  StartThreeSketchOptions,
  RunThreeSketchOptions,
  RunThreeSketchResult,
  ThreeRendererOptions,
  ThreeInstance,
  ThreeContext,
  ThreeSketchContext,
  ThreeLifecycleHandlers,
  ThreeControlPanelOptions,
  MountThreeOptions,
  MountThreeResult,
};

export { createHyperFrameRuntime, HyperFrameRuntime };

const defaultRuntime = createHyperFrameRuntime();
defaultRuntime.registerRenderer(createP5Renderer());
defaultRuntime.registerRenderer(createThreeRenderer());

export const hyperFrameRuntime = defaultRuntime;

export function startHyperFrame<TOptions = Record<string, unknown>>(options: HyperFrameStartOptions<TOptions>): Promise<HyperFrameSession> {
  return defaultRuntime.start(options);
}

export async function startP5Sketch(options: StartP5SketchOptions): Promise<RunP5SketchResultWithInstance> {
  return startP5SketchWithRuntime(defaultRuntime, options);
}

export async function startThreeSketch(options: StartThreeSketchOptions): Promise<RunThreeSketchResult> {
  return startThreeSketchWithRuntime(defaultRuntime, options);
}

if (typeof window !== 'undefined') {
  const globalWindow = window as unknown as {
    hyperFrame?: {
      start?: typeof startHyperFrame;
      registerRenderer?: (renderer: any) => void;
      syncParentStyles?: () => void;
      p5?: {
        mount?: typeof mountP5Sketch;
        run?: typeof runP5Sketch;
        start?: (options: StartP5SketchOptions) => Promise<RunP5SketchResultWithInstance>;
      };
      three?: {
        mount?: typeof mountThreeSketch;
        run?: typeof runThreeSketch;
        start?: (options: StartThreeSketchOptions) => Promise<RunThreeSketchResult>;
      };
    };
  };

  const existing = globalWindow.hyperFrame || {};

  globalWindow.hyperFrame = {
    ...existing,
    start: startHyperFrame,
    registerRenderer: (renderer: any) => {
      defaultRuntime.registerRenderer(renderer);
    },
    syncParentStyles: () => defaultRuntime.syncParentStyles(true),
    p5: {
      ...(existing.p5 || {}),
      mount: mountP5Sketch,
      run: runP5Sketch,
      start: (options: StartP5SketchOptions) => startP5Sketch(options),
    },
    three: {
      ...(existing.three || {}),
      mount: mountThreeSketch,
      run: runThreeSketch,
      start: (options: StartThreeSketchOptions) => startThreeSketch(options),
    },
  };
}
