import { CssBridge } from './cssBridge';
import { DependencyManager, ExternalDependency } from './dependencyManager';
import { resolveContainer } from './utils/dom';
import type { P5Handler } from './types';
import type {
  HyperFrameAdapter,
  HyperFrameAdapterContext,
  HyperFrameRuntimeHandle,
  HyperFrameRuntimeApi,
  HyperFrameStartOptions,
  MountOptions,
  MountResult,
  RunP5SketchOptions,
  RunP5SketchResult,
  RunThreeSketchOptions,
  RunThreeSketchResult,
  StartP5SketchOptions,
  StartThreeSketchOptions,
  P5HandlerMap,
  P5SketchHandlers,
  ThreeLifecycleHandlers,
  P5Instance,
  MountThreeOptions,
  ThreeContext,
} from './types';
import { ControlsBridge } from './controlsBridge';
import type { ControlChangePayload, P5SketchContext, ThreeSketchContext } from './types';

function mapP5Handlers(handlerMap: P5HandlerMap): P5SketchHandlers {
  const mapped: P5SketchHandlers = {};

  Object.entries(handlerMap).forEach(([key, handler]) => {
    if (typeof handler === 'function') {
      mapped[key] = (instance, _context, ...args) => {
        (handler as P5Handler)(instance, ...args);
      };
    }
  });

  return mapped;
}

export interface HyperFrameRuntimeConfig {
  mirrorCss?: boolean;
}

export class HyperFrameRuntime implements HyperFrameRuntimeApi {
  private adapters = new Map<string, HyperFrameAdapter<any>>();
  private dependencyManager = new DependencyManager();
  private cssBridge: CssBridge | null = null;
  private config: HyperFrameRuntimeConfig;

  constructor(config: HyperFrameRuntimeConfig = {}) {
    this.config = config;
  }

  registerAdapter(adapter: HyperFrameAdapter<any>) {
    this.adapters.set(adapter.id, adapter);
  }

  async ensureDependencies(dependencies?: HyperFrameStartOptions['dependencies']): Promise<void> {
    if (!dependencies || dependencies.length === 0) {
      return;
    }

    await this.dependencyManager.ensureAll(
      dependencies as ExternalDependency[],
    );
  }

  mirrorCss(): void {
    if (this.cssBridge) {
      return;
    }
    this.cssBridge = new CssBridge({ mirror: this.config.mirrorCss !== false });
    this.cssBridge.start();
  }

  async start<Options = any>(options: HyperFrameStartOptions<Options>): Promise<HyperFrameRuntimeHandle> {
    const adapter = this.resolveAdapter(options.adapter);

    if (options.dependencies?.length) {
      await this.ensureDependencies(options.dependencies);
    }

    if (this.config.mirrorCss !== false && options.mirrorCss !== false) {
      this.mirrorCss();
    }

    if (typeof adapter.ensure === 'function') {
      await adapter.ensure(options.options, this);
    }

    const mount = this.createMount(options.mount);
    const controlsBridge = new ControlsBridge();

    const sketchContext: P5SketchContext = {
      params: {},
      controls: null,
      getInstance: () => null,
      getP5Instance: () => null,
    };

    const controls = options.controlDefinitions
      ? controlsBridge.init({
          definitions: options.controlDefinitions,
          options: options.controls,
          context: sketchContext,
          onControlChange: (change: ControlChangePayload) => {
            // placeholder to keep compatibility; adapters can override
          },
        })
      : null;

    const adapterContext: HyperFrameAdapterContext = {
      mount: {
        container: mount.container,
        destroy: () => mount.destroy(),
      },
      controls,
      params: controls?.params ?? {},
      runtime: this,
      mountOptions: options.mount,
    };

    const handle = await adapter.start(options.options, adapterContext);

    if (sketchContext) {
      sketchContext.params = adapterContext.params;
      sketchContext.controls = controls;
      const getInstance = () => (handle.getInstance ? handle.getInstance() : null);
      sketchContext.getInstance = getInstance;
      sketchContext.getP5Instance = getInstance;
    }

    const runtimeHandle: HyperFrameRuntimeHandle = {
      destroy: () => {
        handle.destroy();
        mount.destroy();
        if (controls) {
          if (typeof controls.destroy === 'function') {
            controls.destroy();
          } else if (typeof controls.dispose === 'function') {
            controls.dispose();
          }
        }
      },
      setHandlers: handle.setHandlers ? (handlers: Record<string, any>) => handle.setHandlers!(handlers) : undefined,
      getInstance: handle.getInstance ? () => handle.getInstance!() : undefined,
      params: adapterContext.params,
      controls,
      container: mount.container,
    };

    return runtimeHandle;
  }

  private resolveAdapter<Options>(adapter: string | HyperFrameAdapter<Options>): HyperFrameAdapter<Options> {
    if (typeof adapter !== 'string') {
      return adapter;
    }
    const resolved = this.adapters.get(adapter);
    if (!resolved) {
      throw new Error(`[hyper-frame] Adapter "${adapter}" is not registered`);
    }
    return resolved as HyperFrameAdapter<Options>;
  }

  private createMount(options?: MountOptions | Record<string, any>): { container: HTMLElement; destroy(): void } {
    const baseOptions: MountOptions | undefined = options
      ? {
          target: (options as MountOptions).target,
          containerClassName: (options as MountOptions).containerClassName,
          onReady: (options as MountOptions).onReady,
        }
      : undefined;

    const mount = resolveContainer(baseOptions);
    if (baseOptions?.onReady) {
      baseOptions.onReady({ container: mount.element });
    }
    return {
      container: mount.element,
      destroy: () => {
        if (mount.createdInternally) {
          mount.element.remove();
        }
      },
    };
  }

  // Backwards compatibility helpers --------------------------------------------------

  async runP5Sketch(options: RunP5SketchOptions): Promise<RunP5SketchResult> {
    const handle = await this.start({
      adapter: 'p5',
      options: options.handlers,
      controlDefinitions: options.controlDefinitions,
      controls: options.controls,
      mount: options.mount,
      dependencies: options.dependencies,
      mirrorCss: options.mirrorCss,
    });

    const params = handle.params ?? {};
    const controls = handle.controls;

    return {
      params,
      controls,
      context: {
        params,
        controls,
        getP5Instance: () => (handle.getInstance ? handle.getInstance() : null),
        getInstance: () => (handle.getInstance ? handle.getInstance() : null),
      },
      destroy: () => handle.destroy(),
      setHandlers: (handlers: P5SketchHandlers) => handle.setHandlers?.(handlers as Record<string, any>),
      getInstance: () => (handle.getInstance ? (handle.getInstance() as any) : null),
    };
  }

  async startP5Sketch(options: StartP5SketchOptions) {
    const dependencies = [...(options.dependencies ?? [])];
    if (options.p5?.url) {
      dependencies.unshift({ type: 'script', url: options.p5.url });
    }
    return this.runP5Sketch({
      ...options,
      dependencies,
    });
  }

  async mountP5Sketch(handlers: P5HandlerMap, mount?: MountOptions): Promise<MountResult<P5Instance>> {
    const handle = await this.start({
      adapter: 'p5',
      options: mapP5Handlers(handlers),
      mount,
    });

    return {
      container: handle.container,
      getInstance: () => (handle.getInstance ? (handle.getInstance() as P5Instance | null) : null),
      setHandlers: (nextHandlers: Record<string, any>) => {
        handle.setHandlers?.(mapP5Handlers(nextHandlers as P5HandlerMap));
      },
      destroy: () => handle.destroy(),
    };
  }

  async runThreeSketch(options: RunThreeSketchOptions): Promise<RunThreeSketchResult> {
    const handle = await this.start({
      adapter: 'three',
      options: options.handlers,
      controlDefinitions: options.controlDefinitions,
      controls: options.controls,
      mount: options.mount,
      dependencies: options.dependencies,
      mirrorCss: options.mirrorCss,
    });

    const context: ThreeSketchContext = {
      params: handle.params ?? {},
      controls: handle.controls,
      getThreeContext: () => (handle.getInstance ? handle.getInstance() : null),
    };

    return {
      params: handle.params ?? {},
      controls: handle.controls,
      context,
      destroy: () => handle.destroy(),
      setHandlers: (handlers: ThreeLifecycleHandlers) => handle.setHandlers?.(handlers as Record<string, any>),
      getContext: () => (handle.getInstance ? (handle.getInstance() as any) : null),
    };
  }

  async startThreeSketch(options: StartThreeSketchOptions) {
    const dependencies = [...(options.dependencies ?? [])];
    if (options.three?.url) {
      dependencies.unshift({ type: 'script', url: options.three.url });
    }
    return this.runThreeSketch({
      ...options,
      dependencies,
    });
  }

  async mountThreeSketch(handlers: ThreeLifecycleHandlers, mount?: MountThreeOptions): Promise<MountResult<ThreeContext>> {
    const handle = await this.start({
      adapter: 'three',
      options: handlers,
      mount,
    });

    return {
      container: handle.container,
      getInstance: () => (handle.getInstance ? (handle.getInstance() as ThreeContext | null) : null),
      setHandlers: (nextHandlers: Record<string, any>) => {
        handle.setHandlers?.(nextHandlers as ThreeLifecycleHandlers);
      },
      destroy: () => handle.destroy(),
    };
  }
}
