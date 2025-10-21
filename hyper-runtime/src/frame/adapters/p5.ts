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

export type P5Instance = any;

export type P5Handler = (instance: P5Instance, ...args: any[]) => void;

export type P5HandlerMap = Record<string, P5Handler | undefined>;

export interface MountOptions extends ResolveContainerOptions {
  containerClassName?: string;
  onReady?: (context: { p5: P5Instance; container: HTMLElement }) => void;
}

export interface MountResult {
  container: HTMLElement;
  getInstance(): P5Instance | null;
  setHandlers(handlers: P5HandlerMap): void;
  destroy(): void;
}

type P5Constructor = new (sketch: (p5: P5Instance) => void, node?: HTMLElement) => P5Instance;

declare global {
  interface Window {
    p5?: P5Constructor;
  }
}

function getP5Constructor(): P5Constructor {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-frame] window is not available');
  }

  const ctor = window.p5;

  if (typeof ctor !== 'function') {
    throw new Error('[hyper-frame] p5 constructor not found on window. Ensure p5 is loaded before hyper-frame.');
  }

  return ctor as P5Constructor;
}

export function mountP5Sketch(initialHandlers: P5HandlerMap, options?: MountOptions): MountResult {
  if (typeof document === 'undefined') {
    throw new Error('mountP5Sketch cannot run outside a browser environment');
  }

  const opts: MountOptions = options || {};
  const currentHandlers: P5HandlerMap = { ...initialHandlers };
  const containerInfo = resolveContainer({
    target: opts.target,
    className: opts.className || opts.containerClassName,
  });
  const container = containerInfo.element;
  const createdInternally = containerInfo.createdInternally;

  let instance: P5Instance | null = null;

  function sketch(p5Instance: P5Instance) {
    instance = p5Instance;
    applyHandlers(p5Instance, currentHandlers);
    if (opts.onReady) {
      opts.onReady({ p5: p5Instance, container });
    }
  }

  const P5Ctor = getP5Constructor();
  const p5Controller = new P5Ctor(sketch, container);
  if (!instance) {
    instance = (p5Controller as unknown) as P5Instance;
  }

  function setHandlers(nextHandlers: P5HandlerMap) {
    if (!instance) {
      return;
    }
    applyHandlers(instance, nextHandlers);
  }

  function destroy() {
    if (instance) {
      instance.remove();
      instance = null;
    }

    if (createdInternally) {
      container.remove();
    }
  }

  return {
    container,
    getInstance: () => instance,
    setHandlers,
    destroy,
  };
}

function applyHandlers(instance: P5Instance, handlers: P5HandlerMap) {
  Object.keys(handlers).forEach((key) => {
    const handler = handlers[key];
    if (typeof handler === 'function') {
      (instance as Record<string, unknown>)[key] = function handlerWrapper(this: unknown, ...args: any[]) {
        return (handler as P5Handler)(instance as P5Instance, ...args);
      };
    }
  });
}

export interface P5ControlPanelOptions {
  title?: string;
  position?: string;
  expanded?: boolean;
  container?: HTMLElement | string | null;
  onChange?: (change: ControlChangePayload, context: P5SketchContext) => void;
}

export interface P5SketchContext {
  params: Record<string, any>;
  controls: any;
  getP5Instance(): P5Instance | null;
}

export type P5SketchHandler = (p5: P5Instance, context: P5SketchContext, ...args: any[]) => void;

export type P5SketchHandlers = Record<string, P5SketchHandler | undefined>;

export interface RunP5SketchOptions {
  controlDefinitions: ControlDefinitions;
  handlers: P5SketchHandlers;
  controls?: P5ControlPanelOptions;
  mount?: MountOptions;
  preconfiguredControls?: {
    params: Record<string, any>;
    controls: any;
  };
}

export interface RunP5SketchResult {
  params: Record<string, any>;
  controls: any;
  context: P5SketchContext;
  destroy(): void;
  setHandlers(handlers: P5SketchHandlers): void;
  getInstance(): P5Instance | null;
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

function wrapHandlers(
  handlers: P5SketchHandlers,
  context: P5SketchContext,
  setActiveInstance: (instance: P5Instance) => void
): P5HandlerMap {
  const wrapped: P5HandlerMap = {};

  Object.entries(handlers).forEach(([key, handler]) => {
    if (typeof handler === 'function') {
      wrapped[key] = function wrappedHandler(instance: P5Instance, ...args: any[]) {
        setActiveInstance(instance);
        return (handler as P5SketchHandler)(instance, context, ...args);
      };
    }
  });

  return wrapped;
}

export function runP5Sketch(options: RunP5SketchOptions): RunP5SketchResult {
  const controlOptions = options.controls || {};

  let params: Record<string, any>;
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

  const sketchContext: P5SketchContext = {
    params,
    controls: controlsInstance,
    getP5Instance: () => activeInstance,
  };

  let activeInstance: P5Instance | null = null;

  function setActiveInstance(instance: P5Instance) {
    activeInstance = instance;
  }

  const mounted = mountP5Sketch(
    wrapHandlers(options.handlers, sketchContext, setActiveInstance),
    options.mount
  );

  function setHandlers(handlers: P5SketchHandlers) {
    mounted.setHandlers(wrapHandlers(handlers, sketchContext, setActiveInstance));
  }

  return {
    params,
    controls: controlsInstance,
    context: sketchContext,
    destroy() {
      mounted.destroy();
      if (ownsControls && typeof controlsInstance.destroy === 'function') {
        controlsInstance.destroy();
      }
    },
    setHandlers,
    getInstance() {
      return mounted.getInstance();
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

const DEFAULT_P5_CDN_URL = 'https://cdn.jsdelivr.net/npm/p5@1.6.0/lib/p5.min.js';
const P5_SCRIPT_SELECTOR = 'script[data-hypertool="p5"]';

function ensureP5Script(url: string, maxAttempts: number): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('[hyper-frame] window is not available'));
  }

  if (typeof window.p5 === 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    function fulfill() {
      if (settled) return;
      settled = true;
      resolve();
    }

    function fail(error: Error) {
      if (settled) return;
      settled = true;
      reject(error);
    }

    waitForCondition(() => typeof window.p5 === 'function', maxAttempts, 'p5 constructor')
      .then(fulfill)
      .catch(fail);

    function handleScriptError() {
      fail(new Error(`[hyper-frame] Failed to load p5 script from ${url}`));
    }

    const existing = document.querySelector<HTMLScriptElement>(P5_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener('error', handleScriptError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.hypertool = 'p5';
    script.addEventListener('error', handleScriptError, { once: true });
    document.head.appendChild(script);
  });
}

export interface StartP5SketchOptions extends RunP5SketchOptions {
  p5?: {
    url?: string;
    maxAttempts?: number;
  };
  readiness?: {
    maxAttempts?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface RunP5SketchResultWithInstance extends RunP5SketchResult {
  setHandlers(handlers: P5SketchHandlers): void;
  getInstance(): P5Instance | null;
}

export async function startP5SketchWithRuntime(
  runtime: HyperFrameRuntime,
  options: StartP5SketchOptions
): Promise<RunP5SketchResultWithInstance> {
  const readinessAttempts = typeof options.readiness?.maxAttempts === 'number'
    ? options.readiness.maxAttempts
    : 600;

  const p5Attempts = typeof options.p5?.maxAttempts === 'number'
    ? options.p5.maxAttempts
    : readinessAttempts;

  const p5Url = typeof options.p5?.url === 'string' && options.p5.url.trim().length > 0
    ? options.p5.url
    : DEFAULT_P5_CDN_URL;

  await ensureP5Script(p5Url, p5Attempts);

  const instanceRef: { current: P5Instance | null } = { current: null };

  const controlDefinitions = options.controlDefinitions;
  const controlsOptions = options.controls;

  const session = await runtime.start<P5RendererOptions>({
    renderer: 'p5',
    rendererOptions: {
      ...options,
      instanceRef,
    } as P5RendererOptions,
    controls: controlDefinitions
      ? {
          definitions: controlDefinitions as ControlDefinitions,
          options: controlsOptions
            ? {
                ...controlsOptions,
                onChange: controlsOptions.onChange
                  ? (change: ControlChangePayload, context) => {
                      if (!controlsOptions.onChange) {
                        return;
                      }
                      const sketchContext: P5SketchContext = {
                        params: context.params,
                        controls: context.controls,
                        getP5Instance: () => instanceRef.current,
                      };
                      controlsOptions.onChange(change, sketchContext);
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
      getP5Instance: () => (session.getInstance ? (session.getInstance() as P5Instance | null) : instanceRef.current),
    },
    destroy: () => session.destroy(),
    setHandlers: (handlers: P5SketchHandlers) => {
      if (session.update) {
        session.update({ type: 'handlers', handlers });
      }
    },
    getInstance: () => (session.getInstance ? (session.getInstance() as P5Instance | null) : instanceRef.current),
  };
}

export interface P5RendererSession extends HyperFrameRendererSession {
  setHandlers(handlers: P5SketchHandlers): void;
}

export interface P5RendererOptions extends StartP5SketchOptions {
  instanceRef?: { current: P5Instance | null };
}

export function createP5Renderer(): HyperFrameRenderer<P5RendererOptions, P5RendererSession> {
  return {
    id: 'p5',
    async mount(context: HyperFrameRendererContext<P5RendererOptions>) {
      const options = context.options;
      const instanceRef = options.instanceRef || { current: null };

      let activeInstance: P5Instance | null = null;

      const sketchContext: P5SketchContext = {
        params: context.params,
        controls: context.controls,
        getP5Instance: () => activeInstance,
      };

      const wrappedHandlers = wrapHandlers(options.handlers || {}, sketchContext, (instance) => {
        activeInstance = instance;
        instanceRef.current = instance;
      });

      const mountResult = mountP5Sketch(wrappedHandlers, {
        ...(options.mount || {}),
        target: context.container,
        className: options.mount?.className || options.mount?.containerClassName || context.container.className,
        containerClassName: options.mount?.containerClassName,
        onReady: (readyContext) => {
          activeInstance = readyContext.p5;
          instanceRef.current = readyContext.p5;
          if (options.mount?.onReady) {
            options.mount.onReady(readyContext);
          }
        },
      });

      return {
        destroy: () => {
          mountResult.destroy();
        },
        update: (message: unknown) => {
          if (
            message &&
            typeof message === 'object' &&
            (message as { type?: string }).type === 'handlers'
          ) {
            const payload = message as { handlers?: P5SketchHandlers };
            if (payload.handlers) {
              mountResult.setHandlers(
                wrapHandlers(payload.handlers, sketchContext, (instance) => {
                  activeInstance = instance;
                  instanceRef.current = instance;
                })
              );
            }
          }
        },
        getInstance: () => mountResult.getInstance(),
        setHandlers: (handlers: P5SketchHandlers) => {
          mountResult.setHandlers(
            wrapHandlers(handlers, sketchContext, (instance) => {
              activeInstance = instance;
              instanceRef.current = instance;
            })
          );
        },
      } as P5RendererSession;
    },
  };
}
