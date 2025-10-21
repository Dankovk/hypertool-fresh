import { CssBridge } from './cssBridge';
import { DependencyManager, ExternalDependency } from './dependencyManager';
import { ControlsBridge } from './controlsBridge';
import { ExportBridge } from './exportBridge';
import { resolveContainer } from './utils/dom';
import type {
  ControlDefinitions,
  ControlPanelOptions,
  ExportWidgetHandle,
  ExportWidgetOptions,
  HyperFrameAdapter,
  HyperFrameAdapterContext,
  HyperFrameExportProvider,
  HyperFrameRuntimeApi,
  HyperFrameRuntimeHandle,
  HyperFrameStartOptions,
  HyperFrameControlContext,
  MountOptions,
} from './types';

export interface HyperFrameRuntimeConfig {
  mirrorCss?: boolean;
  exportWidget?: boolean;
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

    await this.dependencyManager.ensureAll(dependencies as ExternalDependency[]);
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
      await this.ensureDependencies(options.dependencies as ExternalDependency[]);
    }

    if (this.config.mirrorCss !== false && options.mirrorCss !== false) {
      this.mirrorCss();
    }

    if (typeof adapter.ensure === 'function') {
      await adapter.ensure(options.options, this);
    }

    const mount = this.createMount(options.mount);
    const controlContext: HyperFrameControlContext = {
      params: {},
      controls: null,
      getInstance: () => null,
    };

    const controls = this.createControls(options.controlDefinitions, options.controls, controlContext);
    const params = controls?.params ?? {};
    controlContext.params = params;
    controlContext.controls = controls;

    let exportProvider: HyperFrameExportProvider | null = null;
    const shouldEnableExport = this.config.exportWidget !== false && options.exporter !== false;
    const exportBridge = shouldEnableExport ? new ExportBridge() : null;
    let exporterHandle: ExportWidgetHandle | null = null;

    const updateExportProvider = (provider: HyperFrameExportProvider | null) => {
      exportProvider = provider;
      exportBridge?.setProvider(provider);
    };

    const adapterContext: HyperFrameAdapterContext = {
      mount: {
        container: mount.container,
        destroy: () => mount.destroy(),
      },
      controls,
      params,
      runtime: this,
      mountOptions: options.mount,
      registerExportProvider: updateExportProvider,
    };

    const handle = await adapter.start(options.options, adapterContext);

    if (handle.exports) {
      updateExportProvider(handle.exports);
    }

    if (exportBridge) {
      const exportOptions = typeof options.exporter === 'object' ? (options.exporter as ExportWidgetOptions) : undefined;
      exporterHandle = exportBridge.init({
        container: mount.container,
        options: exportOptions,
        provider: exportProvider,
      });
    }

    if (handle.getInstance) {
      controlContext.getInstance = () => handle.getInstance!();
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
        exporterHandle?.destroy();
      },
      setHandlers: handle.setHandlers ? (handlers: Record<string, any>) => handle.setHandlers!(handlers) : undefined,
      getInstance: handle.getInstance ? () => handle.getInstance!() : undefined,
      params,
      controls,
      container: mount.container,
      exporter: exporterHandle,
      exports: handle.exports,
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

  private createControls(
    definitions: ControlDefinitions | undefined,
    options: ControlPanelOptions | undefined,
    context: HyperFrameControlContext,
  ) {
    if (!definitions) {
      return null;
    }

    const bridge = new ControlsBridge();
    return bridge.init({
      definitions,
      options,
      context,
      onControlChange: () => {
        // Adapters can override via custom control bridges
      },
    });
  }
}
