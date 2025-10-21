import { HyperFrameRuntime } from './runtime';
import { inlineAdapter, type InlineAdapterOptions } from './adapters/inline';
import type { HyperFrameAdapter, HyperFrameRuntimeHandle, HyperFrameStartOptions, ExportWidgetOptions, ControlDefinitions, ControlPanelOptions, HyperFrameDependencyDescriptor, MountOptions } from './types';
declare const runtime: HyperFrameRuntime;
export { runtime, inlineAdapter };
export declare function registerAdapter(adapter: HyperFrameAdapter<any>): void;
export declare function start<Options>(options: HyperFrameStartOptions<Options>): Promise<HyperFrameRuntimeHandle>;
export declare function ensureDependencies(dependencies?: HyperFrameStartOptions['dependencies']): Promise<void>;
export declare function mirrorCss(): void;
type InlineStartBase = Omit<HyperFrameStartOptions<InlineAdapterOptions>, 'adapter' | 'options'>;
export interface InlineStartOptions extends InlineStartBase, InlineAdapterOptions {
    exporter?: ExportWidgetOptions | false;
}
export declare function startInline(options?: InlineStartOptions): Promise<HyperFrameRuntimeHandle>;
export declare function attachToWindow(): void;
export type { HyperFrameRuntimeHandle };
export type { HyperFrameStartOptions, HyperFrameAdapter, ControlDefinitions, ControlPanelOptions, HyperFrameDependencyDescriptor, MountOptions, ExportWidgetOptions, };
//# sourceMappingURL=index.d.ts.map