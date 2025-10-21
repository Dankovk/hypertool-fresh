interface CssBridgeOptions {
    sourceDocument?: Document | null;
    targetDocument?: Document | null;
    mirror?: boolean;
}
export declare class CssBridge {
    private source;
    private target;
    private observer;
    private nodeMap;
    private active;
    constructor(options?: CssBridgeOptions);
    start(): void;
    stop(): void;
    private cleanupPreviousClones;
    private syncAll;
    private attachObserver;
    private handleChildListMutation;
    private handleCharacterDataMutation;
    private handleAttributeMutation;
    private cloneNode;
}
export {};
//# sourceMappingURL=cssBridge.d.ts.map