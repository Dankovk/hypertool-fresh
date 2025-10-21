import type { HyperFrameAdapter, HyperFrameAdapterContext, HyperFrameAdapterHandle, HyperFrameExportProvider } from '../types';
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
export declare const inlineAdapter: HyperFrameAdapter<InlineAdapterOptions | undefined>;
//# sourceMappingURL=inline.d.ts.map