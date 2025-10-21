export type ExternalDependencyType = 'script' | 'style';
export interface ExternalDependency {
    type: ExternalDependencyType;
    url: string;
    attributes?: Record<string, string>;
    integrity?: string;
    crossOrigin?: string;
}
export declare class DependencyManager {
    private pending;
    ensure(dependency: ExternalDependency): Promise<void>;
    ensureAll(dependencies?: ExternalDependency[]): Promise<void>;
    private createKey;
    private load;
    private injectScript;
    private injectStyle;
}
//# sourceMappingURL=dependencyManager.d.ts.map