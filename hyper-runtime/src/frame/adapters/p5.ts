import type {
  HyperFrameAdapter,
  HyperFrameAdapterContext,
  HyperFrameAdapterHandle,
  P5Instance,
  P5SketchHandlers,
  P5SketchContext,
} from '../types';
import { waitForCondition } from '../utils/wait';

const DEFAULT_P5_CDN_URL = 'https://cdn.jsdelivr.net/npm/p5@1.6.0/lib/p5.min.js';

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

  const ctor = (window as any).p5;

  if (typeof ctor !== 'function') {
    throw new Error('[hyper-frame] p5 constructor not found on window. Ensure p5 is loaded before hyper-frame.');
  }

  return ctor as P5Constructor;
}

function applyHandlers(instance: P5Instance, handlers: Record<string, (...args: any[]) => void>) {
  for (const key in handlers) {
    if (Object.prototype.hasOwnProperty.call(handlers, key)) {
      const handler = handlers[key];
      if (typeof handler === 'function') {
        (instance as Record<string, unknown>)[key] = handler;
      }
    }
  }
}

function wrapHandlers(
  handlers: P5SketchHandlers,
  sketchContext: P5SketchContext
): Record<string, (...args: any[]) => void> {
  const wrapped: Record<string, (...args: any[]) => void> = {};

  Object.entries(handlers).forEach(([key, handler]) => {
    if (typeof handler === 'function') {
      wrapped[key] = (instance: P5Instance, ...args: any[]) => {
        return handler(instance, sketchContext, ...args);
      };
    }
  });

  return wrapped;
}

async function ensureP5Available(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-frame] window is not available');
  }

  if (typeof (window as any).p5 === 'function') {
    return;
  }

  if (typeof document === 'undefined') {
    throw new Error('[hyper-frame] document is not available');
  }

  const scriptUrl = DEFAULT_P5_CDN_URL;
  const existing = Array.from(document.querySelectorAll(`script[src="${scriptUrl}"]`));
  if (existing.length === 0) {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.hyperFrame = 'p5';
    document.head.appendChild(script);
  }

  await waitForCondition(() => typeof (window as any).p5 === 'function', 300, 'p5 constructor');
}

export const p5Adapter: HyperFrameAdapter<P5SketchHandlers> = {
  id: 'p5',
  async ensure(_handlers, runtime) {
    try {
      await ensureP5Available();
    } catch (error) {
      await runtime.ensureDependencies([{ type: 'script', url: DEFAULT_P5_CDN_URL }]);
      await waitForCondition(() => typeof (window as any).p5 === 'function', 300, 'p5 constructor');
    }
  },
  async start(handlers: P5SketchHandlers, context: HyperFrameAdapterContext): Promise<HyperFrameAdapterHandle> {
    if (typeof document === 'undefined') {
      throw new Error('mountP5Sketch cannot run outside a browser environment');
    }

    let activeInstance: P5Instance | null = null;
    let currentHandlers: P5SketchHandlers = { ...handlers };

    const sketchContext: P5SketchContext = {
      params: context.params,
      controls: context.controls,
      getInstance: () => activeInstance,
      getP5Instance: () => activeInstance,
    };

    const wrappedHandlers = () => wrapHandlers(currentHandlers, sketchContext);

    function sketch(p5Instance: P5Instance) {
      activeInstance = p5Instance;
      applyHandlers(p5Instance, wrappedHandlers());
    }

    const P5Ctor = getP5Constructor();
    const p5Controller = new P5Ctor(sketch, context.mount.container);
    if (!activeInstance) {
      activeInstance = (p5Controller as unknown) as P5Instance;
    }

    return {
      destroy() {
        if (activeInstance) {
          activeInstance.remove();
          activeInstance = null;
        }
      },
      setHandlers(nextHandlers: Record<string, any>) {
        currentHandlers = { ...nextHandlers } as P5SketchHandlers;
        if (activeInstance) {
          applyHandlers(activeInstance, wrappedHandlers());
        }
      },
      getInstance() {
        return activeInstance;
      },
    };
  },
};
