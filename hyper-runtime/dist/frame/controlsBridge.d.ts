import type { ControlDefinitions, ControlPanelOptions, ControlChangePayload, SandboxContext } from './types';
export interface ControlsBridgeInitOptions {
    definitions: ControlDefinitions;
    options?: ControlPanelOptions;
    context: SandboxContext;
    onControlChange?: (change: ControlChangePayload) => void;
}
export declare class ControlsBridge {
    private controlsApi;
    constructor();
    private resolveControlsApi;
    init(options: ControlsBridgeInitOptions): {
        params: Record<string, any>;
        dispose: () => void;
    } & Record<string, any>;
}
//# sourceMappingURL=controlsBridge.d.ts.map