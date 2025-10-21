import type {
  HyperFrameRenderer,
  HyperFrameRendererContext,
  HyperFrameRendererSession,
  ControlDefinitions,
  ControlChangePayload,
} from '../types';
import { HyperFrameRuntime } from '../runtime';
import type { ResolveContainerOptions } from '../dom';
import { resolveContainer } from '../dom';

export type ThreeInstance = any;

export interface ThreeContext {
  scene: any;
  camera: any;
  renderer: any;
  controls?: any;
}

export interface ThreeSketchContext {
  params: Record<string, any>;
  controls: any;
  getThreeContext(): ThreeContext | null;
}

export type ThreeSketchHandler = (three: ThreeContext, context: ThreeSketchContext, ...args: any[]) => void;

export interface ThreeLifecycleHandlers {
  setup?: ThreeSketchHandler;
  animate?: ThreeSketchHandler;
  resize?: ThreeSketchHandler;
  dispose?: () => void;
}

export interface MountThreeOptions extends ResolveContainerOptions {
  containerClassName?: string;
  camera?: {
    type?: 'perspective' | 'orthographic';
    fov?: number;
    near?: number;
    far?: number;
    position?: [number, number, number];
  };
  renderer?: {
    antialias?: boolean;
    alpha?: boolean;
    preserveDrawingBuffer?: boolean;
  };
  orbitControls?: boolean;
  onReady?: (context: ThreeContext) => void;
}

export interface MountThreeResult {
  container: HTMLElement;
  getContext(): ThreeContext | null;
  destroy(): void;
  startAnimation(): void;
  stopAnimation(): void;
  setHandlers(handlers: ThreeLifecycleHandlers): void;
}

function getThreeConstructors(): any {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-frame] window is not available');
  }

  const THREE = (window as any).THREE;

  if (typeof THREE !== 'object') {
    throw new Error('[hyper-frame] THREE not found on window. Make sure to import and expose Three.js on window in your sketch.');
  }

  return THREE;
}

export function mountThreeSketch(initialHandlers: ThreeLifecycleHandlers, options?: MountThreeOptions): MountThreeResult {
  if (typeof document === 'undefined') {
    throw new Error('mountThreeSketch cannot run outside a browser environment');
  }

  const opts: MountThreeOptions = options || {};
  const THREE = getThreeConstructors();

  const containerInfo = resolveContainer({
    target: opts.target,
    className: opts.className || opts.containerClassName || 'hyperframe-three-sketch',
  });
  const container = containerInfo.element;
  const createdInternally = containerInfo.createdInternally;

  const scene = new THREE.Scene();

  const cameraOpts = opts.camera || {};
  const cameraType = cameraOpts.type || 'perspective';
  let camera: any;

  if (cameraType === 'perspective') {
    camera = new THREE.PerspectiveCamera(
      cameraOpts.fov || 75,
      window.innerWidth / window.innerHeight,
      cameraOpts.near || 0.1,
      cameraOpts.far || 1000
    );
  } else {
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
      -aspect,
      aspect,
      1,
      -1,
      cameraOpts.near || 0.1,
      cameraOpts.far || 1000
    );
  }

  if (cameraOpts.position) {
    camera.position.set(...cameraOpts.position);
  } else {
    camera.position.z = 5;
  }

  const rendererOpts = opts.renderer || {};
  const renderer = new THREE.WebGLRenderer({
    antialias: rendererOpts.antialias !== false,
    alpha: rendererOpts.alpha || false,
    preserveDrawingBuffer: rendererOpts.preserveDrawingBuffer || false,
  });
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  let orbitControls: any = null;
  if (opts.orbitControls) {
    const OrbitControls = (window as any).OrbitControls || THREE.OrbitControls;
    if (OrbitControls) {
      orbitControls = new OrbitControls(camera, renderer.domElement);
    } else {
      console.warn('[hyper-frame] OrbitControls not found. Make sure to import and expose it on window.');
    }
  }

  const threeContext: ThreeContext = {
    scene,
    camera,
    renderer,
    controls: orbitControls,
  };

  let animationId: number | null = null;
  let isAnimating = false;
  let currentHandlers: ThreeLifecycleHandlers = { ...initialHandlers };

  const sketchContextPlaceholder: ThreeSketchContext = {
    params: {},
    controls: null,
    getThreeContext: () => threeContext,
  };

  function handleResize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    } else if (camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height;
      camera.left = -aspect;
      camera.right = aspect;
      camera.updateProjectionMatrix();
    }

    renderer.setSize(width, height);

    if (currentHandlers.resize) {
      currentHandlers.resize(threeContext, sketchContextPlaceholder);
    }
  }

  function animate() {
    if (!isAnimating) {
      return;
    }

    animationId = requestAnimationFrame(animate);

    if (currentHandlers.animate) {
      currentHandlers.animate(threeContext, sketchContextPlaceholder);
    }

    renderer.render(scene, camera);
  }

  function startAnimation() {
    if (isAnimating) {
      return;
    }
    isAnimating = true;
    animate();
  }

  function stopAnimation() {
    isAnimating = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  window.addEventListener('resize', handleResize);

  if (currentHandlers.setup) {
    currentHandlers.setup(threeContext, sketchContextPlaceholder);
  }

  startAnimation();

  if (opts.onReady) {
    opts.onReady(threeContext);
  }

  return {
    container,
    getContext: () => threeContext,
    destroy() {
      stopAnimation();
      window.removeEventListener('resize', handleResize);
      if (currentHandlers.dispose) {
        currentHandlers.dispose();
      }
      if (orbitControls) {
        orbitControls.dispose();
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
      if (createdInternally) {
        container.remove();
      }
    },
    startAnimation,
    stopAnimation,
    setHandlers(nextHandlers: ThreeLifecycleHandlers) {
      currentHandlers = { ...nextHandlers };
    },
  };
}

export interface ThreeControlPanelOptions {
  title?: string;
  position?: string;
  expanded?: boolean;
  container?: HTMLElement | string | null;
  onChange?: (change: ControlChangePayload, context: ThreeSketchContext) => void;
}

export interface RunThreeSketchOptions {
  controlDefinitions: ControlDefinitions;
  handlers: ThreeLifecycleHandlers;
  controls?: ThreeControlPanelOptions;
  mount?: MountThreeOptions;
  preconfiguredControls?: {
    params: Record<string, any>;
    controls: any;
  };
}

export interface RunThreeSketchResult {
  params: Record<string, any>;
  controls: any;
  context: ThreeSketchContext;
  threeContext: ThreeContext;
  destroy(): void;
  getInstance(): ThreeContext | null;
}

function getHypertoolControls(): any {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-frame] window is not available');
  }
  const hyperWindow = window as unknown as {
    hypertoolControls?: any;
  };

  if (!hyperWindow.hypertoolControls) {
    throw new Error('[hyper-frame] hypertool controls are not available on window');
  }

  return hyperWindow.hypertoolControls;
}

export function runThreeSketch(options: RunThreeSketchOptions): RunThreeSketchResult {
  const controlOptions = options.controls || {};

  let params: Record<string, any> = {};
  let controlsInstance: any;
  let ownsControls = false;

  if (options.preconfiguredControls) {
    params = options.preconfiguredControls.params;
    controlsInstance = options.preconfiguredControls.controls;
  } else {
    const controlsApi = getHypertoolControls();
    controlsInstance = controlsApi.createControlPanel(options.controlDefinitions, {
      title: controlOptions.title,
      position: controlOptions.position,
      expanded: controlOptions.expanded,
      container: controlOptions.container,
      onChange: (updatedParams: Record<string, any>, changeContext: any) => {
        sketchContext.params = updatedParams;
        if (typeof controlOptions.onChange === 'function') {
          const change: ControlChangePayload = {
            key: changeContext.key,
            value: changeContext.value,
            event: changeContext.event,
          };
          controlOptions.onChange(change, sketchContext);
        }
      },
    });
    params = controlsInstance.params;
    ownsControls = true;
  }

  let mountResult: MountThreeResult | null = null;

  const sketchContext: ThreeSketchContext = {
    params,
    controls: controlsInstance,
    getThreeContext: () => (mountResult ? mountResult.getContext() : null),
  };

  const wrappedHandlers: ThreeLifecycleHandlers = {
    setup: options.handlers.setup
      ? (three, _ctx) => options.handlers.setup!(three, sketchContext)
      : undefined,
    animate: options.handlers.animate
      ? (three, _ctx) => options.handlers.animate!(three, sketchContext)
      : undefined,
    resize: options.handlers.resize
      ? (three, _ctx) => options.handlers.resize!(three, sketchContext)
      : undefined,
    dispose: options.handlers.dispose,
  };

  mountResult = mountThreeSketch(wrappedHandlers, options.mount);

  return {
    params,
    controls: controlsInstance,
    context: sketchContext,
    threeContext: mountResult.getContext()!,
    destroy() {
      mountResult?.destroy();
      if (ownsControls && typeof controlsInstance.destroy === 'function') {
        controlsInstance.destroy();
      }
    },
    getInstance() {
      return mountResult ? mountResult.getContext() : null;
    },
  };
}

function nextFrame(callback: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 16);
  }
}

function waitForCondition(condition: () => boolean, maxAttempts: number, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function tick() {
      attempts += 1;

      try {
        if (condition()) {
          resolve();
          return;
        }
      } catch (error) {}

      if (attempts >= maxAttempts) {
        reject(new Error(`[hyper-frame] Timed out waiting for ${label}`));
        return;
      }

      nextFrame(tick);
    }

    tick();
  });
}

function ensureThreeReady(maxAttempts: number): Promise<void> {
  return waitForCondition(() => {
    try {
      getThreeConstructors();
      return true;
    } catch (error) {
      return false;
    }
  }, maxAttempts, 'THREE constructor');
}

export interface StartThreeSketchOptions extends RunThreeSketchOptions {
  readiness?: {
    maxAttempts?: number;
  };
  metadata?: Record<string, unknown>;
}

export async function startThreeSketchWithRuntime(
  runtime: HyperFrameRuntime,
  options: StartThreeSketchOptions
): Promise<RunThreeSketchResult> {
  const readinessAttempts = typeof options.readiness?.maxAttempts === 'number'
    ? options.readiness.maxAttempts
    : 600;

  await ensureThreeReady(readinessAttempts);

  const threeContextRef: { current: ThreeContext | null } = { current: null };

  const session = await runtime.start<ThreeRendererOptions>({
    renderer: 'three',
    rendererOptions: {
      ...options,
      threeContextRef,
    } as ThreeRendererOptions,
    controls: options.controlDefinitions
      ? {
          definitions: options.controlDefinitions as ControlDefinitions,
          options: options.controls
            ? {
                ...options.controls,
                onChange: options.controls.onChange
                  ? (change: ControlChangePayload, context) => {
                      if (!options.controls?.onChange) {
                        return;
                      }
                      const sketchContext: ThreeSketchContext = {
                        params: context.params,
                        controls: context.controls,
                        getThreeContext: () => threeContextRef.current,
                      };
                      options.controls.onChange(change, sketchContext);
                    }
                  : undefined,
              }
            : undefined,
        }
      : null,
    target: options.mount?.target ?? null,
    containerClassName: options.mount?.className || options.mount?.containerClassName,
    metadata: options.metadata,
  });

  return {
    params: session.params,
    controls: session.controls,
    context: {
      params: session.params,
      controls: session.controls,
      getThreeContext: () => (session.getInstance ? (session.getInstance() as ThreeContext | null) : threeContextRef.current),
    },
    threeContext: (session.getInstance ? (session.getInstance() as ThreeContext | null) : threeContextRef.current)!,
    destroy: () => session.destroy(),
    getInstance: () => (session.getInstance ? (session.getInstance() as ThreeContext | null) : threeContextRef.current),
  };
}

interface ThreeRendererSession extends HyperFrameRendererSession {}

export interface ThreeRendererOptions extends StartThreeSketchOptions {
  threeContextRef?: { current: ThreeContext | null };
}

export function createThreeRenderer(): HyperFrameRenderer<ThreeRendererOptions, ThreeRendererSession> {
  return {
    id: 'three',
    async mount(context: HyperFrameRendererContext<ThreeRendererOptions>) {
      const options = context.options;
      const threeContextRef = options.threeContextRef || { current: null };

      let mountResult: MountThreeResult | null = null;

      const sketchContext: ThreeSketchContext = {
        params: context.params,
        controls: context.controls,
        getThreeContext: () => (mountResult ? mountResult.getContext() : null),
      };

      const wrappedHandlers: ThreeLifecycleHandlers = {
        setup: options.handlers.setup
          ? (three, _ctx) => options.handlers.setup!(three, sketchContext)
          : undefined,
        animate: options.handlers.animate
          ? (three, _ctx) => options.handlers.animate!(three, sketchContext)
          : undefined,
        resize: options.handlers.resize
          ? (three, _ctx) => options.handlers.resize!(three, sketchContext)
          : undefined,
        dispose: options.handlers.dispose,
      };

      mountResult = mountThreeSketch(wrappedHandlers, {
        ...(options.mount || {}),
        target: context.container,
        className: options.mount?.className || options.mount?.containerClassName || context.container.className,
        containerClassName: options.mount?.containerClassName,
        onReady: (readyContext) => {
          threeContextRef.current = readyContext;
          if (options.mount?.onReady) {
            options.mount.onReady(readyContext);
          }
        },
      });

      threeContextRef.current = mountResult.getContext();

      return {
        destroy: () => {
          mountResult?.destroy();
        },
        update: (message: unknown) => {
          if (
            message &&
            typeof message === 'object' &&
            (message as { type?: string }).type === 'handlers'
          ) {
            const payload = message as { handlers?: ThreeLifecycleHandlers };
            const nextHandlers = payload.handlers;
            if (nextHandlers) {
              const mergedHandlers: ThreeLifecycleHandlers = {
                setup: nextHandlers.setup
                  ? (three, _ctx) => nextHandlers.setup!(three, sketchContext)
                  : options.handlers.setup
                    ? (three, _ctx) => options.handlers.setup!(three, sketchContext)
                    : undefined,
                animate: nextHandlers.animate
                  ? (three, _ctx) => nextHandlers.animate!(three, sketchContext)
                  : options.handlers.animate
                    ? (three, _ctx) => options.handlers.animate!(three, sketchContext)
                    : undefined,
                resize: nextHandlers.resize
                  ? (three, _ctx) => nextHandlers.resize!(three, sketchContext)
                  : options.handlers.resize
                    ? (three, _ctx) => options.handlers.resize!(three, sketchContext)
                    : undefined,
                dispose: nextHandlers.dispose || options.handlers.dispose,
              };
              mountResult?.setHandlers(mergedHandlers);
            }
          }
        },
        getInstance: () => (mountResult ? mountResult.getContext() : null),
      };
    },
  };
}
