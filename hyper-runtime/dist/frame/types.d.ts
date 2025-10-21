export type ControlType = 'number' | 'color' | 'boolean' | 'string' | 'select';
export interface BaseControlDefinition {
    label?: string;
    value: any;
}
export interface NumberControlDefinition extends BaseControlDefinition {
    type: 'number';
    value: number;
    min?: number;
    max?: number;
    step?: number;
}
export interface ColorControlDefinition extends BaseControlDefinition {
    type: 'color';
    value: string;
}
export interface BooleanControlDefinition extends BaseControlDefinition {
    type: 'boolean';
    value: boolean;
}
export interface StringControlDefinition extends BaseControlDefinition {
    type: 'string';
    value: string;
}
export interface SelectControlDefinition extends BaseControlDefinition {
    type: 'select';
    value: string | number;
    options: Record<string, string | number> | Array<string | number>;
}
export type ControlDefinition = NumberControlDefinition | ColorControlDefinition | BooleanControlDefinition | StringControlDefinition | SelectControlDefinition;
export type ControlDefinitions = Record<string, ControlDefinition>;
export interface ControlChangePayload {
    key: string;
    value: any;
    event: any;
}
export interface HyperFrameControlSetup {
    definitions: ControlDefinitions;
    options?: ControlPanelOptions;
}
export interface ControlPanelOptions {
    title?: string;
    position?: string;
    expanded?: boolean;
    container?: HTMLElement | string | null;
    onChange?: (change: ControlChangePayload, context: HyperFrameContext) => void;
}
export interface HyperFrameControlRuntime {
    params: Record<string, any>;
    controls: any;
    destroy(): void;
}
export interface HyperFrameEnvironment {
    window: Window;
    document: Document;
}
export interface HyperFrameContext {
    params: Record<string, any>;
    controls: any | null;
    container: HTMLElement;
    environment: HyperFrameEnvironment;
    metadata?: Record<string, unknown>;
    rendererOptions?: Record<string, unknown>;
    sendMessage(type: string, payload?: unknown): void;
    onMessage(type: string, handler: HyperFrameMessageHandler): () => void;
}
export type HyperFrameMessageHandler = (payload: unknown) => void;
export interface HyperFrameRendererSession {
    destroy?(): void;
    update?(data: unknown): void;
    getInstance?(): unknown;
}
export interface HyperFrameRendererContext<TOptions = Record<string, unknown>> extends HyperFrameContext {
    options: TOptions;
}
export interface HyperFrameRenderer<TOptions = Record<string, unknown>, TSession extends HyperFrameRendererSession = HyperFrameRendererSession> {
    id: string;
    prepare?(options: TOptions): Promise<void> | void;
    mount(context: HyperFrameRendererContext<TOptions>): Promise<TSession | void> | TSession | void;
}
export interface HyperFrameStartOptions<TOptions = Record<string, unknown>> {
    renderer?: string;
    rendererOptions?: TOptions;
    controls?: HyperFrameControlSetup | null;
    target?: HTMLElement | string | null;
    containerClassName?: string;
    syncParentStyles?: boolean;
    metadata?: Record<string, unknown>;
}
export interface HyperFrameSession {
    params: Record<string, any>;
    controls: any | null;
    container: HTMLElement;
    metadata?: Record<string, unknown>;
    destroy(): void;
    update?(data: unknown): void;
    getInstance?(): unknown;
}
//# sourceMappingURL=types.d.ts.map