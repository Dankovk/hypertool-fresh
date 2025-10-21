import { CssBridge } from './cssBridge';
import { ControlsBridge } from './controlsBridge';
import { ExportBridge } from './exportBridge';
import { DependencyManager, ExternalDependency } from './dependencyManager';
import {
  HyperFrameRuntimeApi,
  HyperFrameRuntimeConfig,
  HyperFrameSandboxHandle,
  HyperFrameSandboxOptions,
  SandboxContext,
  SandboxControlsHandle,
  SandboxEnvironment,
} from './types';
import { resolveContainer } from './utils/dom';

function runCleanups(cleanups: Array<() => void>) {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) {
      try {
        cleanup();
      } catch (error) {
        console.error('[hyper-frame] cleanup failed', error);
      }
    }
  }
}

export class HyperFrameRuntime implements HyperFrameRuntimeApi {
  private dependencyManager = new DependencyManager();
  private cssBridge: CssBridge | null = null;
  private config: HyperFrameRuntimeConfig;

  constructor(config: HyperFrameRuntimeConfig = {}) {
    this.config = config;
  }

  async ensureDependencies(dependencies: ExternalDependency[] = []): Promise<void> {
    if (!dependencies.length) {
      return;
    }

    await this.dependencyManager.ensureAll(dependencies);
  }

  mirrorCss(): void {
    if (this.cssBridge) {
      return;
    }

    this.cssBridge = new CssBridge({ mirror: this.config.mirrorCss !== false });
    this.cssBridge.start();
  }

  async createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle> {
    if (options.dependencies?.length) {
      await this.ensureDependencies(options.dependencies);
    }

    if (this.config.mirrorCss !== false && options.mirrorCss !== false) {
      this.mirrorCss();
    }

    const mount = this.createMount(options.mount);
    const cleanups: Array<() => void> = [];
    const pushCleanup = (cleanup: () => void) => {
      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    };

    const exportBridge = new ExportBridge({
      container: mount.container,
      position: options.exportWidget?.position,
      filename: options.exportWidget?.filename,
    });

    if (options.exportWidget?.enabled === false) {
      exportBridge.setVisible(false);
    }

    if (options.exportWidget?.useCanvasCapture !== false) {
      exportBridge.useDefaultCanvasCapture(true);
    }

    const environment = this.createEnvironment(pushCleanup);

    const context: SandboxContext = {
      mount: mount.container,
      params: {},
      controls: null,
      exports: exportBridge.getApi(),
      runtime: this,
      environment,
    };

    let controlsHandle: SandboxControlsHandle | null = null;

    if (options.controls?.definitions) {
      const controlsBridge = new ControlsBridge();
      controlsHandle = controlsBridge.init({
        definitions: options.controls.definitions,
        options: options.controls.options,
        context,
        onControlChange: (change) => {
          options.controls?.onChange?.(change, context);
        },
      }) as SandboxControlsHandle;

      context.controls = controlsHandle;
      context.params = controlsHandle?.params ?? {};

      pushCleanup(() => {
        if (!controlsHandle) return;
        if (typeof controlsHandle.destroy === 'function') {
          controlsHandle.destroy();
        } else if (typeof controlsHandle.dispose === 'function') {
          controlsHandle.dispose();
        }
      });
    }

    pushCleanup(() => exportBridge.destroy());
    pushCleanup(() => mount.destroy());

    let setupCleanup: void | (() => void);
    try {
      setupCleanup = await options.setup(context);
    } catch (error) {
      console.error('[hyper-frame] sandbox setup failed', error);
      runCleanups(cleanups);
      throw error;
    }

    if (typeof setupCleanup === 'function') {
      pushCleanup(() => {
        try {
          setupCleanup?.();
        } catch (error) {
          console.error('[hyper-frame] teardown failed', error);
        }
      });
    }

    const handle: HyperFrameSandboxHandle = {
      container: mount.container,
      controls: controlsHandle,
      params: context.params,
      destroy: () => {
        runCleanups(cleanups);
      },
    };

    return handle;
  }

  private createEnvironment(pushCleanup: (cleanup: () => void) => void): SandboxEnvironment {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('[hyper-frame] window or document is not available');
    }

    return {
      window,
      document,
      addCleanup: (cleanup: () => void) => {
        if (typeof cleanup === 'function') {
          pushCleanup(cleanup);
        }
      },
      onResize: (handler: () => void, options?: AddEventListenerOptions) => {
        window.addEventListener('resize', handler, options);
        const dispose = () => window.removeEventListener('resize', handler, options);
        pushCleanup(dispose);
        return dispose;
      },
    };
  }

  private createMount(options?: HyperFrameSandboxOptions['mount']): { container: HTMLElement; destroy(): void } {
    const baseOptions = options as any;
    const resolved = resolveContainer({
      target: baseOptions?.target,
      containerClassName: baseOptions?.containerClassName,
    });

    if (typeof baseOptions?.onReady === 'function') {
      baseOptions.onReady({ container: resolved.element });
    }

    return {
      container: resolved.element,
      destroy: () => {
        if (resolved.createdInternally) {
          resolved.element.remove();
        }
      },
    };
  }
}
