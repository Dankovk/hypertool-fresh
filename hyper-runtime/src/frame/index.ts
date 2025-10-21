import { HyperFrameRuntime } from './runtime';
import { inlineAdapter, type InlineAdapterOptions } from './adapters/inline';
import type {
  HyperFrameAdapter,
  HyperFrameRuntimeHandle,
  HyperFrameStartOptions,
  ExportWidgetOptions,
  ControlDefinitions,
  ControlPanelOptions,
  HyperFrameDependencyDescriptor,
  MountOptions,
} from './types';

const runtime = new HyperFrameRuntime({ mirrorCss: true, exportWidget: true });

runtime.registerAdapter(inlineAdapter);

export { runtime, inlineAdapter };

export function registerAdapter(adapter: HyperFrameAdapter<any>) {
  runtime.registerAdapter(adapter);
}

export function start<Options>(options: HyperFrameStartOptions<Options>) {
  return runtime.start(options);
}

export function ensureDependencies(dependencies?: HyperFrameStartOptions['dependencies']) {
  return runtime.ensureDependencies(dependencies);
}

export function mirrorCss() {
  runtime.mirrorCss();
}

type InlineStartBase = Omit<HyperFrameStartOptions<InlineAdapterOptions>, 'adapter' | 'options'>;

export interface InlineStartOptions
  extends InlineStartBase,
    InlineAdapterOptions {
  exporter?: ExportWidgetOptions | false;
}

export function startInline(options: InlineStartOptions = {} as InlineStartOptions): Promise<HyperFrameRuntimeHandle> {
  const { setup, ...rest } = options;
  const base = rest as InlineStartBase;

  return start({
    ...base,
    adapter: inlineAdapter,
    options: { setup },
  });
}

export function attachToWindow() {
  if (typeof window === 'undefined') {
    return;
  }

  const hyperWindow = window as unknown as {
    hyperFrame?: any;
  };

  const api = {
    version: 'next',
    runtime,
    registerAdapter,
    ensureDependencies,
    mirrorCss,
    start,
    inline: {
      adapter: inlineAdapter,
      start: startInline,
    },
  };

  hyperWindow.hyperFrame = { ...(hyperWindow.hyperFrame || {}), ...api };
}

attachToWindow();

export type { HyperFrameRuntimeHandle };
export type {
  HyperFrameStartOptions,
  HyperFrameAdapter,
  ControlDefinitions,
  ControlPanelOptions,
  HyperFrameDependencyDescriptor,
  MountOptions,
  ExportWidgetOptions,
};
