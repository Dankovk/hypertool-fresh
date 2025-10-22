import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CssBridge } from './cssBridge';
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
import { WrapperApp } from './wrapper-app/WrapperApp';

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

    const mount = this.createReactMount(options);
    const cleanups: Array<() => void> = [];
    const pushCleanup = (cleanup: () => void) => {
      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    };

    const environment = this.createEnvironment(pushCleanup);

    // Create a minimal exports API (will be used by ExportWidget)
    const exportsApi = {
      registerImageCapture: () => {},
      registerVideoCapture: () => {},
      setFilename: () => {},
      setVisible: () => {},
      useDefaultCanvasCapture: () => {},
      destroy: () => {},
    };

    const context: SandboxContext = {
      mount: mount.sandboxContainer,
      params: {},
      controls: null,
      exports: exportsApi,
      runtime: this,
      environment,
    };

    let controlsHandle: SandboxControlsHandle | null = null;

    // If controls are configured, we'll handle them via React component
    // but we still need to create a handle for the context
    if (options.controls?.definitions) {
      // Create a proxy object that will be updated when controls are initialized
      controlsHandle = {
        params: {},
        dispose: () => {},
      };

      context.controls = controlsHandle;
      context.params = controlsHandle.params;
    }

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
      container: mount.sandboxContainer,
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

  private createReactMount(options: HyperFrameSandboxOptions): {
    sandboxContainer: HTMLElement;
    destroy(): void;
  } {
    const baseOptions = options.mount as any;
    const resolved = resolveContainer({
      target: baseOptions?.target,
      containerClassName: baseOptions?.containerClassName,
    });

    // Create a temporary div that will act as the sandbox container
    // React will render into this
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '100%';
    tempContainer.style.height = '100%';

    // Create a ref for the sandbox container
    const sandboxContainerRef = React.createRef<HTMLDivElement>();

    // Create React root
    const root = createRoot(resolved.element);

    // Render the WrapperApp
    root.render(
      React.createElement(WrapperApp, {
        sandboxContainerRef,
        controls: options.controls
          ? {
              definitions: options.controls.definitions,
              options: options.controls.options,
              onChange: (change) => options.controls?.onChange?.(change, {} as any),
            }
          : null,
        exportWidget: {
          enabled: options.exportWidget?.enabled !== false,
          filename: options.exportWidget?.filename,
          position: options.exportWidget?.position,
          useCanvasCapture: options.exportWidget?.useCanvasCapture !== false,
        },
        container: tempContainer,
        exportsApi: undefined,
      })
    );

    // Use a microtask to wait for React to render
    // This ensures the ref is populated before we continue
    let sandboxContainer: HTMLElement = tempContainer;

    // Schedule a check for the ref after React renders
    Promise.resolve().then(() => {
      if (sandboxContainerRef.current) {
        sandboxContainer = sandboxContainerRef.current;
      }

      if (typeof baseOptions?.onReady === 'function') {
        baseOptions.onReady({ container: sandboxContainer });
      }
    });

    return {
      sandboxContainer: tempContainer,
      destroy: () => {
        root.unmount();
        if (resolved.createdInternally) {
          resolved.element.remove();
        }
      },
    };
  }
}
