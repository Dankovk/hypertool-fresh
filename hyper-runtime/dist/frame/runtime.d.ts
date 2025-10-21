import { HyperFrameMessageHandler, HyperFrameRenderer, HyperFrameSession, HyperFrameStartOptions } from './types';
interface HyperFrameRuntimeOptions {
    autoSyncParentStyles?: boolean;
    defaultContainerClassName?: string;
}
export declare class HyperFrameRuntime {
    private readonly renderers;
    private readonly listeners;
    private readonly options;
    private styleMirror;
    private activeSession;
    private readyAttempts;
    constructor(options?: HyperFrameRuntimeOptions);
    registerRenderer<TOptions = Record<string, unknown>>(renderer: HyperFrameRenderer<TOptions>): void;
    unregisterRenderer(id: string): void;
    listRenderers(): string[];
    syncParentStyles(force?: boolean): void;
    onMessage(type: string, handler: HyperFrameMessageHandler): () => void;
    sendMessage(type: string, payload?: unknown): void;
    start<TOptions = Record<string, unknown>>(options: HyperFrameStartOptions<TOptions>): Promise<HyperFrameSession>;
    private destroyActiveSession;
    private emitLocal;
    private handleIncomingMessage;
}
export declare function createHyperFrameRuntime(options?: HyperFrameRuntimeOptions): HyperFrameRuntime;
export {};
//# sourceMappingURL=runtime.d.ts.map