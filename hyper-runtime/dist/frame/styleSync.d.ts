interface StyleMirrorOptions {
    sourceDocument?: Document | null;
}
export declare class ParentStyleMirror {
    private readonly targetDocument;
    private observer;
    private readonly mappings;
    private readonly reverseMappings;
    private readonly anchor;
    private running;
    private sourceDocument;
    private sourceIdCounter;
    constructor(targetDocument: Document);
    start(options?: StyleMirrorOptions): void;
    stop(): void;
    private tryResolveParentDocument;
    private copyInitialNodes;
    private observeSource;
    private ensureMirror;
    private removeMirror;
    private updateMirror;
    private applyAttributes;
    private createSourceId;
}
export declare function syncParentStyles(targetDocument: Document, options?: StyleMirrorOptions): ParentStyleMirror;
export {};
//# sourceMappingURL=styleSync.d.ts.map