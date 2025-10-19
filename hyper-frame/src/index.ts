import P5 from 'p5';

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

/**
 * Mount a p5 sketch with the provided lifecycle handlers.
 */
export function mountP5Sketch(initialHandlers: P5HandlerMap, options: MountOptions = {}): MountResult {
  if (typeof document === 'undefined') {
    throw new Error('mountP5Sketch cannot run outside a browser environment');
  }

  let currentHandlers = { ...initialHandlers };
  const { element: container, createdInternally } = resolveContainer(options);

  let instance: P5Instance | null = null;

  const sketch = (p5Instance: P5Instance) => {
    instance = p5Instance;
    applyHandlers(p5Instance, currentHandlers);
    if (options.onReady) {
      options.onReady({ p5: p5Instance, container });
    }
  };

  const p5Controller = new P5(sketch, container);
  if (!instance) {
    // Fallback in case P5 constructor behaved differently
    instance = (p5Controller as unknown) as P5Instance;
  }

  const setHandlers = (nextHandlers: P5HandlerMap) => {
    currentHandlers = { ...nextHandlers };
    if (instance) {
      applyHandlers(instance, currentHandlers);
    }
  };

  const destroy = () => {
    if (instance) {
      instance.remove();
      instance = null;
    }

    if (createdInternally) {
      // Remove container only when library created it
      container.remove();
    }
  };

  return {
    container,
    getInstance() {
      return instance;
    },
    setHandlers,
    destroy,
  };
}

function applyHandlers(instance: P5Instance, handlers: P5HandlerMap) {
  Object.entries(handlers).forEach(([key, handler]) => {
    if (typeof handler === 'function') {
      (instance as Record<string, unknown>)[key] = (...args: any[]) => {
      return (handler as P5Handler)(instance, ...args);
      };
    }
  });
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
    console.warn(`[hyper-frame] Could not find container for selector "${target}", creating one instead.`);
  }

  const container = document.createElement('div');
  container.classList.add(className);
  document.body.appendChild(container);
  return { element: container, createdInternally: true };
}
