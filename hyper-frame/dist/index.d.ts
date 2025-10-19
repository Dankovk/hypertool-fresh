export type P5Instance = any;
export type P5Handler = (instance: P5Instance, ...args: any[]) => void;
export type P5HandlerMap = Record<string, P5Handler | undefined>;
export interface MountOptions {
    /**
     * Target element or selector to mount into.
     * When omitted, a container div will be created and appended to body.
     */
    target?: HTMLElement | string | null;
    /**
     * Class name to apply to the container.
     * Defaults to `hypertool-sketch`.
     */
    containerClassName?: string;
    /**
     * Called when the p5 instance has been created.
     */
    onReady?: (context: {
        p5: P5Instance;
        container: HTMLElement;
    }) => void;
}
export interface MountResult {
    /**
     * Root container element used by p5.
     */
    container: HTMLElement;
    /**
     * Retrieve the active p5 instance, if available.
     */
    getInstance(): P5Instance | null;
    /**
     * Replace lifecycle handlers with new implementations.
     * Existing p5 event bindings are refreshed immediately.
     */
    setHandlers(handlers: P5HandlerMap): void;
    /**
     * Dispose of the p5 sketch and remove the container if it was created automatically.
     */
    destroy(): void;
}
/**
 * Mount a p5 sketch with the provided lifecycle handlers.
 */
export declare function mountP5Sketch(initialHandlers: P5HandlerMap, options?: MountOptions): MountResult;
