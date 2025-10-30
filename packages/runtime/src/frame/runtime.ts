import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CssBridge } from './cssBridge';

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

  private cssBridge: CssBridge | null = null;
  private config: HyperFrameRuntimeConfig;

  constructor(config: HyperFrameRuntimeConfig = {}) {
    this.config = config;
    


  }



  mirrorCss(): void {
    if (this.cssBridge) {
      return;
    }

    this.cssBridge = new CssBridge({ mirror: this.config.mirrorCss !== false });
    this.cssBridge.start();
  }



  async createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle> {


    if (this.config.mirrorCss !== false && options.mirrorCss !== false) {
      this.mirrorCss();
    }

    const cleanups: Array<(() => void)> = [];
    const pushCleanup = (cleanup: () => void) => {
      if (typeof cleanup === 'function') {
        cleanups.push(cleanup);
      }
    };

    const environment = this.createEnvironment(pushCleanup);

    // Create a minimal exports API (used by TopBar for capture/recording)
    const exportsApi = {
      registerImageCapture: () => {},
      registerVideoCapture: () => {},
      setFilename: () => {},
      setVisible: () => {},
      useDefaultCanvasCapture: () => {},
      destroy: () => {},
    };

    let controlsHandle: SandboxControlsHandle | null = null;
    const context: SandboxContext = {
      mount: null as any, // Will be set by mount
      params: {},
      controls: null,
      exports: exportsApi,
      runtime: this,
      environment,
    };

    // If controls are configured, set up a callback to update the context when they're ready
    const controlsConfig = options.controls?.definitions
      ? {
          definitions: options.controls.definitions,
          options: options.controls.options,
          onChange: (change: any) => options.controls?.onChange?.(change, context),
          onReady: (controls: any) => {
            // Update the controls handle with the actual params
            if (controlsHandle) {
              controlsHandle.params = controls.params;
              controlsHandle.dispose = controls.dispose || controls.destroy;
            }
            // Update context params to point to the actual controls params
            context.params = controls.params;
            context.controls = controlsHandle;
          },
        }
      : null;

    // Create controls handle placeholder
    if (controlsConfig) {
      controlsHandle = {
        params: {},
        dispose: () => {},
      };
      context.controls = controlsHandle;
    }

    // Create mount with controls configuration
    const mount = await this.createReactMount({
      ...options,
      controls: controlsConfig as any,
    });

    // Update context with mounted container
    context.mount = mount.sandboxContainer;

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

  private async createReactMount(options: HyperFrameSandboxOptions & { controls?: any }): Promise<{
    sandboxContainer: HTMLElement;
    destroy(): void;
  }> {
    const baseOptions = options.mount as any;
    const resolved = resolveContainer({
      target: baseOptions?.target,
      containerClassName: baseOptions?.containerClassName,
    });

    // Create React root
    const root = createRoot(resolved.element);

    // Create a promise that resolves when the container is ready
    const containerPromise = new Promise<HTMLElement>((resolve) => {
      // Render the WrapperApp with a callback
      root.render(
        React.createElement(WrapperApp, {
          onContainerReady: resolve,
          controls: options.controls || null,
          exportWidget: {
            enabled: options.exportWidget?.enabled !== false,
            filename: options.exportWidget?.filename,
            position: options.exportWidget?.position,
            useCanvasCapture: options.exportWidget?.useCanvasCapture !== false,
          },
        })
      );
    });

    // Wait for React to mount the container with proper dimensions
    const sandboxContainer = await containerPromise;

    if (typeof baseOptions?.onReady === 'function') {
      baseOptions.onReady({ container: sandboxContainer });
    }

    return {
      sandboxContainer,
      destroy: () => {
        root.unmount();
        if (resolved.createdInternally) {
          resolved.element.remove();
        }
      },
    };
  }
}
