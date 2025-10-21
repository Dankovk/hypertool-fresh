import type {
  HyperFrameAdapter,
  HyperFrameAdapterContext,
  HyperFrameAdapterHandle,
  HyperFrameExportProvider,
} from '../types';

export interface InlineHostContext extends Omit<HyperFrameAdapterContext, 'mount'> {
  container: HTMLElement;
  registerExports(provider: HyperFrameExportProvider): void;
}

export interface InlineHostLifecycle extends Omit<HyperFrameAdapterHandle, 'destroy'> {
  destroy?(): void;
  exports?: HyperFrameExportProvider | null;
}

export interface InlineAdapterOptions {
  setup?(context: InlineHostContext): Promise<InlineHostLifecycle | void> | InlineHostLifecycle | void;
}

export const inlineAdapter: HyperFrameAdapter<InlineAdapterOptions | undefined> = {
  id: 'inline',
  async start(options, context) {
    const lifecycle = (await options?.setup?.(createHostContext(context))) || {};

    if (lifecycle.exports) {
      context.registerExportProvider?.(lifecycle.exports);
    }

    return normalizeLifecycle(lifecycle);
  },
};

function createHostContext(context: HyperFrameAdapterContext): InlineHostContext {
  return {
    container: context.mount.container,
    controls: context.controls,
    params: context.params,
    runtime: context.runtime,
    mountOptions: context.mountOptions,
    registerExports(provider) {
      context.registerExportProvider?.(provider);
    },
  };
}

function normalizeLifecycle(lifecycle: InlineHostLifecycle): HyperFrameAdapterHandle {
  return {
    destroy: lifecycle.destroy?.bind(lifecycle) ?? (() => {}),
    setHandlers: lifecycle.setHandlers?.bind(lifecycle),
    getInstance: lifecycle.getInstance?.bind(lifecycle),
    exports: lifecycle.exports ?? null,
  };
}
