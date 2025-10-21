export interface ResolvedContainer {
    element: HTMLElement;
    createdInternally: boolean;
}
export interface ResolveContainerOptions {
    target?: HTMLElement | string | null;
    className?: string;
}
export declare function resolveContainer(options?: ResolveContainerOptions): ResolvedContainer;
//# sourceMappingURL=dom.d.ts.map