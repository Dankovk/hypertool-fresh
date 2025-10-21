import {
  createControlPanel as createControlPanelInternal,
  type ControlChangeContext,
  type ControlDefinitions,
  type ControlPosition,
  type HypertoolControlsOptions,
  type ParameterValues,
} from "../controls";

type ControlsApi = {
  createControlPanel: typeof createControlPanelInternal;
};

const FALLBACK_CONTROLS_API: ControlsApi = {
  createControlPanel: createControlPanelInternal,
};

export type {
  ControlDefinitions,
  ControlDefinition,
  NumberControlDefinition,
  ColorControlDefinition,
  BooleanControlDefinition,
  StringControlDefinition,
  SelectControlDefinition,
  ControlPosition,
  ParameterValues,
  ControlChangeContext,
  HypertoolControlsOptions,
} from "../controls";

export type P5Instance = any;

export type P5Handler = (instance: P5Instance, ...args: any[]) => void;

export type P5HandlerMap = Record<string, P5Handler | undefined>;

export interface MountOptions {
  /**
   * Target element or selector to mount into.
   * When omitted, a container div will be created and appended to body.
   */
  target?: HTMLElement | string | null;
  /**
   * Class name to apply to the container.
   * Defaults to `hypertool-sketch`.
   */
  containerClassName?: string;
  /**
   * Called when the p5 instance has been created.
   */
  onReady?: (context: { p5: P5Instance; container: HTMLElement }) => void;
}

export interface MountResult {
  /**
   * Root container element used by p5.
   */
  container: HTMLElement;
  /**
   * Retrieve the active p5 instance, if available.
   */
  getInstance(): P5Instance | null;
  /**
   * Replace lifecycle handlers with new implementations.
   * Existing p5 event bindings are refreshed immediately.
   */
  setHandlers(handlers: P5HandlerMap): void;
  /**
   * Dispose of the p5 sketch and remove the container if it was created automatically.
   */
  destroy(): void;
}

type P5Constructor = new (sketch: (p5: P5Instance) => void, node?: HTMLElement) => P5Instance;

function getP5Constructor(): P5Constructor {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-runtime] window is not available');
  }

  const ctor = (window as any).p5;

  if (typeof ctor !== 'function') {
    throw new Error('[hyper-runtime] p5 constructor not found on window. Ensure p5 is loaded before hyper-frame.');
  }

  return ctor as P5Constructor;
}

/**
 * Mount a p5 sketch with the provided lifecycle handlers.
 */
export function mountP5Sketch(initialHandlers: P5HandlerMap, options?: MountOptions): MountResult {
  if (typeof document === 'undefined') {
    throw new Error('mountP5Sketch cannot run outside a browser environment');
  }

  var opts: MountOptions = options || {};
  var currentHandlers: P5HandlerMap = { ...initialHandlers };
  var containerInfo = resolveContainer(opts);
  var container = containerInfo.element;
  var createdInternally = containerInfo.createdInternally;

  var instance: P5Instance | null = null;

  function sketch(p5Instance: P5Instance) {
    instance = p5Instance;
    applyHandlers(p5Instance, currentHandlers);
    if (opts.onReady) {
      opts.onReady({ p5: p5Instance, container });
    }
  }

  var P5Ctor = getP5Constructor();
  var p5Controller = new P5Ctor(sketch, container);
  if (!instance) {
    // Fallback in case P5 constructor behaved differently
    instance = (p5Controller as unknown) as P5Instance;
  }

  function setHandlers(nextHandlers: P5HandlerMap) {
    currentHandlers = { ...nextHandlers };
    if (instance) {
      applyHandlers(instance, currentHandlers);
    }
  }

  function destroy() {
    if (instance) {
      instance.remove();
      instance = null;
    }

    if (createdInternally) {
      // Remove container only when library created it
      container.remove();
    }
  }

  return {
    container: container,
    getInstance: function getInstance() {
      return instance;
    },
    setHandlers: setHandlers,
    destroy: destroy,
  };
}

function applyHandlers(instance: P5Instance, handlers: P5HandlerMap) {
  for (const key in handlers) {
    if (Object.prototype.hasOwnProperty.call(handlers, key)) {
      const handler = handlers[key];
      if (typeof handler === 'function') {
        (instance as Record<string, unknown>)[key] = function handlerWrapper(...args: any[]) {
          return (handler as P5Handler)(instance, ...args);
        };
      }
    }
  }
}

function resolveContainer(options: MountOptions): { element: HTMLElement; createdInternally: boolean } {
  const className = options.containerClassName || 'hypertool-sketch';
  const target = options.target;

  if (target instanceof HTMLElement) {
    target.classList.add(className);
    return { element: target, createdInternally: false };
  }

  if (typeof target === 'string' && target.trim().length > 0) {
    const node = document.querySelector<HTMLElement>(target);
    if (node) {
      node.classList.add(className);
      return { element: node, createdInternally: false };
    }
    console.warn(`[hyper-runtime] Could not find container for selector "${target}", creating one instead.`);
  }

  const container = document.createElement('div');
  container.classList.add(className);
  document.body.appendChild(container);
  return { element: container, createdInternally: true };
}

export interface ControlChangePayload {
  key: string;
  value: any;
  event: any;
}

export interface P5SketchContext {
  params: Record<string, any>;
  controls: any;
  getP5Instance(): P5Instance | null;
}

export type P5SketchHandler = (p5: P5Instance, context: P5SketchContext, ...args: any[]) => void;

export type P5SketchHandlers = Record<string, P5SketchHandler | undefined>;

export interface ControlPanelOptions {
  title?: string;
  position?: ControlPosition;
  expanded?: boolean;
  container?: HTMLElement | string | null;
  onChange?: (change: ControlChangePayload, context: P5SketchContext) => void;
}

export interface RunP5SketchOptions {
  controlDefinitions: ControlDefinitions;
  handlers: P5SketchHandlers;
  controls?: ControlPanelOptions;
  mount?: MountOptions;
}

export interface RunP5SketchResult {
  params: Record<string, any>;
  controls: any;
  context: P5SketchContext;
  destroy(): void;
  setHandlers(handlers: P5SketchHandlers): void;
  getInstance(): P5Instance | null;
}

function getHypertoolControls(): ControlsApi {
  if (typeof window === 'undefined') {
    return FALLBACK_CONTROLS_API;
  }

  const hyperWindow = window as unknown as {
    hypertoolControls?: ControlsApi;
    hyperRuntime?: { controls?: ControlsApi };
  };

  if (hyperWindow.hyperRuntime?.controls?.createControlPanel) {
    return hyperWindow.hyperRuntime.controls;
  }

  if (hyperWindow.hypertoolControls?.createControlPanel) {
    return hyperWindow.hypertoolControls;
  }

  return FALLBACK_CONTROLS_API;
}

function areControlsReady(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  const hyperWindow = window as unknown as {
    hypertoolControls?: ControlsApi;
    hyperRuntime?: { controls?: ControlsApi };
  };

  return Boolean(
    hyperWindow.hyperRuntime?.controls?.createControlPanel ||
      hyperWindow.hypertoolControls?.createControlPanel
  );
}

function wrapHandlers(
  handlers: P5SketchHandlers,
  context: P5SketchContext,
  setActiveInstance: (instance: P5Instance) => void
): P5HandlerMap {
  const wrapped: P5HandlerMap = {};

  Object.entries(handlers).forEach(function entry([key, handler]) {
    if (typeof handler === 'function') {
      wrapped[key] = function wrappedHandler(instance: P5Instance, ...args: any[]) {
        setActiveInstance(instance);
        return (handler as P5SketchHandler)(instance, context, ...args);
      };
    }
  });

  return wrapped;
}

/**
 * High level helper that wires up the bundled controls and p5 mounting in one call.
 */
export function runP5Sketch(options: RunP5SketchOptions): RunP5SketchResult {
  const controlsApi = getHypertoolControls();
  const controlOptions = options.controls || {};

  const controls = controlsApi.createControlPanel(options.controlDefinitions, {
    title: controlOptions.title,
    position: controlOptions.position,
    expanded: controlOptions.expanded,
    container: controlOptions.container,
    onChange: (params: Record<string, any>, changeContext: any) => {
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

  const sketchContext: P5SketchContext = {
    params: controls.params,
    controls,
    getP5Instance: function getP5Instance() {
      return activeInstance;
    },
  };

  let activeInstance: P5Instance | null = null;

  function setActiveInstance(instance: P5Instance) {
    activeInstance = instance;
  }

  const mounted = mountP5Sketch(
    wrapHandlers(options.handlers, sketchContext, setActiveInstance),
    options.mount || {}
  );

  function setHandlers(handlers: P5SketchHandlers) {
    mounted.setHandlers(wrapHandlers(handlers, sketchContext, setActiveInstance));
  }

  return {
    params: controls.params,
    controls,
    context: sketchContext,
    destroy() {
      mounted.destroy();
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
      } catch (error) {
        // ignore errors from condition evaluation and keep waiting
      }

      if (attempts >= maxAttempts) {
        reject(new Error(`[hyper-runtime] Timed out waiting for ${label}`));
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
    return Promise.reject(new Error('[hyper-runtime] window is not available'));
  }

  if (typeof (window as any).p5 === 'function') {
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

    waitForCondition(
      () => typeof (window as any).p5 === 'function',
      maxAttempts,
      'p5 constructor'
    )
      .then(fulfill)
      .catch(fail);

    function handleScriptError() {
      fail(new Error(`[hyper-runtime] Failed to load p5 script from ${url}`));
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

function ensureControlsReady(maxAttempts: number): Promise<void> {
  return waitForCondition(
    () => areControlsReady(),
    maxAttempts,
    'hypertool controls'
  );
}

export interface StartP5SketchOptions extends RunP5SketchOptions {
  p5?: {
    url?: string;
    maxAttempts?: number;
  };
  readiness?: {
    maxAttempts?: number;
  };
}

/**
 * Bootstrap a p5 sketch by ensuring p5 and the controls library are ready.
 */
export async function startP5Sketch(options: StartP5SketchOptions): Promise<RunP5SketchResult> {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-runtime] window is not available');
  }

  const readinessOptions = options.readiness || {};
  const p5Options = options.p5 || {};

  const readinessAttempts = typeof readinessOptions.maxAttempts === 'number'
    ? readinessOptions.maxAttempts
    : 600;

  const p5Attempts = typeof p5Options.maxAttempts === 'number'
    ? p5Options.maxAttempts
    : readinessAttempts;

  const p5Url = typeof p5Options.url === 'string' && p5Options.url.trim().length > 0
    ? p5Options.url
    : DEFAULT_P5_CDN_URL;

  await ensureP5Script(p5Url, p5Attempts);
  await ensureControlsReady(readinessAttempts);

  return runP5Sketch({
    controlDefinitions: options.controlDefinitions,
    handlers: options.handlers,
    controls: options.controls,
    mount: options.mount,
  });
}

// ============================================================================
// THREE.JS INTEGRATION
// ============================================================================

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

export interface MountThreeOptions {
  target?: HTMLElement | string | null;
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
}

function getThreeConstructors(): any {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-runtime] window is not available');
  }

  const THREE = (window as any).THREE;

  if (typeof THREE !== 'object') {
    throw new Error('[hyper-runtime] THREE not found on window. Make sure to import and expose Three.js on window in your sketch.');
  }

  return THREE;
}

/**
 * Mount a Three.js scene with basic setup
 */
export function mountThreeSketch(handlers: ThreeLifecycleHandlers, options?: MountThreeOptions): MountThreeResult {
  if (typeof document === 'undefined') {
    throw new Error('mountThreeSketch cannot run outside a browser environment');
  }

  const opts: MountThreeOptions = options || {};
  const THREE = getThreeConstructors();

  const containerInfo = resolveContainer({
    target: opts.target,
    containerClassName: opts.containerClassName || 'hypertool-three-sketch'
  });
  const container = containerInfo.element;
  const createdInternally = containerInfo.createdInternally;

  // Create scene
  const scene = new THREE.Scene();

  // Create camera
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
      -aspect, aspect, 1, -1,
      cameraOpts.near || 0.1,
      cameraOpts.far || 1000
    );
  }

  if (cameraOpts.position) {
    camera.position.set(...cameraOpts.position);
  } else {
    camera.position.z = 5;
  }

  // Create renderer
  const rendererOpts = opts.renderer || {};
  const renderer = new THREE.WebGLRenderer({
    antialias: rendererOpts.antialias !== false,
    alpha: rendererOpts.alpha || false,
    preserveDrawingBuffer: rendererOpts.preserveDrawingBuffer || false,
  });
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Optional orbit controls
  let orbitControls: any = null;
  if (opts.orbitControls) {
    const OrbitControls = (window as any).OrbitControls || THREE.OrbitControls;
    if (OrbitControls) {
      orbitControls = new OrbitControls(camera, renderer.domElement);
    } else {
      console.warn('[hyper-runtime] OrbitControls not found. Make sure to import and expose it on window.');
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

  // Handle window resize
  function handleResize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    if (handlers.resize) {
      handlers.resize(threeContext, {} as ThreeSketchContext);
    }
  }

  window.addEventListener('resize', handleResize);

  // Animation loop
  function animate() {
    if (!isAnimating) return;

    animationId = requestAnimationFrame(animate);

    if (orbitControls) {
      orbitControls.update();
    }

    if (handlers.animate) {
      handlers.animate(threeContext, {} as ThreeSketchContext);
    }

    renderer.render(scene, camera);
  }

  // Call setup if provided
  if (handlers.setup) {
    handlers.setup(threeContext, {} as ThreeSketchContext);
  }

  if (opts.onReady) {
    opts.onReady(threeContext);
  }

  function startAnimation() {
    if (!isAnimating) {
      isAnimating = true;
      animate();
    }
  }

  function stopAnimation() {
    isAnimating = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function destroy() {
    stopAnimation();
    window.removeEventListener('resize', handleResize);

    if (handlers.dispose) {
      handlers.dispose();
    }

    if (orbitControls) {
      orbitControls.dispose();
    }

    renderer.dispose();
    container.removeChild(renderer.domElement);

    if (createdInternally) {
      container.remove();
    }
  }

  // Start animation by default
  startAnimation();

  return {
    container,
    getContext: () => threeContext,
    destroy,
    startAnimation,
    stopAnimation,
  };
}

export interface RunThreeSketchOptions {
  controlDefinitions: ControlDefinitions;
  handlers: ThreeLifecycleHandlers;
  controls?: ControlPanelOptions;
  mount?: MountThreeOptions;
}

export interface RunThreeSketchResult {
  params: Record<string, any>;
  controls: any;
  context: ThreeSketchContext;
  threeContext: ThreeContext;
  destroy(): void;
  getInstance(): ThreeContext | null;
}

/**
 * High level helper that wires up the bundled controls and Three.js mounting in one call.
 */
export function runThreeSketch(options: RunThreeSketchOptions): RunThreeSketchResult {
  const controlsApi = getHypertoolControls();
  const controlOptions = options.controls || {};

  const sketchContext: ThreeSketchContext = {
    params: {},
    controls: null as any,
    getThreeContext: () => threeContext,
  };

  const controls = controlsApi.createControlPanel(options.controlDefinitions, {
    title: controlOptions.title,
    position: controlOptions.position,
    expanded: controlOptions.expanded,
    container: controlOptions.container,
    onChange: (params: Record<string, any>, changeContext: any) => {
      sketchContext.params = params;
      if (typeof controlOptions.onChange === 'function') {
        const change: ControlChangePayload = {
          key: changeContext.key,
          value: changeContext.value,
          event: changeContext.event,
        };
        (controlOptions.onChange as any)(change, sketchContext);
      }
    },
  });

  sketchContext.params = controls.params;
  sketchContext.controls = controls;

  // Wrap handlers with context
  const wrappedHandlers: ThreeLifecycleHandlers = {};

  if (options.handlers.setup) {
    const originalSetup = options.handlers.setup;
    wrappedHandlers.setup = (three: ThreeContext, _ctx: ThreeSketchContext) => {
      originalSetup(three, sketchContext);
    };
  }

  if (options.handlers.animate) {
    const originalAnimate = options.handlers.animate;
    wrappedHandlers.animate = (three: ThreeContext, _ctx: ThreeSketchContext) => {
      originalAnimate(three, sketchContext);
    };
  }

  if (options.handlers.resize) {
    const originalResize = options.handlers.resize;
    wrappedHandlers.resize = (three: ThreeContext, _ctx: ThreeSketchContext) => {
      originalResize(three, sketchContext);
    };
  }

  if (options.handlers.dispose) {
    wrappedHandlers.dispose = options.handlers.dispose;
  }

  const mounted = mountThreeSketch(wrappedHandlers, options.mount || {});
  const threeContext = mounted.getContext()!;

  return {
    params: controls.params,
    controls,
    context: sketchContext,
    threeContext,
    destroy() {
      mounted.destroy();
    },
    getInstance() {
      return mounted.getContext();
    },
  };
}

function ensureThreeReady(maxAttempts: number): Promise<void> {
  return waitForCondition(function condition() {
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
}

/**
 * Bootstrap a Three.js sketch by ensuring Three.js and the controls library are ready.
 *
 * Note: Three.js should be imported as a module and exposed on window.THREE
 * in your sketch entry point.
 */
export async function startThreeSketch(options: StartThreeSketchOptions): Promise<RunThreeSketchResult> {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-runtime] window is not available');
  }

  const readinessOptions = options.readiness || {};

  const readinessAttempts = typeof readinessOptions.maxAttempts === 'number'
    ? readinessOptions.maxAttempts
    : 600;

  await ensureThreeReady(readinessAttempts);
  await ensureControlsReady(readinessAttempts);

  return runThreeSketch({
    controlDefinitions: options.controlDefinitions,
    handlers: options.handlers,
    controls: options.controls,
    mount: options.mount,
  });
}
