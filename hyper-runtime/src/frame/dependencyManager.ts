export type ExternalDependencyType = 'script' | 'style';

export interface ExternalDependency {
  type: ExternalDependencyType;
  url: string;
  attributes?: Record<string, string>;
  integrity?: string;
  crossOrigin?: string;
}

export class DependencyManager {
  private pending: Map<string, Promise<void>> = new Map();

  ensure(dependency: ExternalDependency): Promise<void> {
    const key = this.createKey(dependency);
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const task = this.load(dependency);
    this.pending.set(key, task);
    return task;
  }

  async ensureAll(dependencies: ExternalDependency[] = []): Promise<void> {
    for (const dependency of dependencies) {
      await this.ensure(dependency);
    }
  }

  private createKey(dependency: ExternalDependency): string {
    return `${dependency.type}:${dependency.url}`;
  }

  private load(dependency: ExternalDependency): Promise<void> {
    switch (dependency.type) {
      case 'script':
        return this.injectScript(dependency);
      case 'style':
        return this.injectStyle(dependency);
      default:
        return Promise.reject(new Error(`[hyper-frame] Unsupported dependency type: ${dependency.type}`));
    }
  }

  private injectScript(dependency: ExternalDependency): Promise<void> {
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('[hyper-frame] document is not available'));
    }

    const existing = Array.from(document.querySelectorAll<HTMLScriptElement>('script')).find(
      (script) => script.src === dependency.url,
    );
    if (existing) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = dependency.url;
      script.async = true;
      script.dataset.hyperFrame = 'external';

      if (dependency.integrity) {
        script.integrity = dependency.integrity;
      }
      if (dependency.crossOrigin) {
        script.crossOrigin = dependency.crossOrigin;
      }
      if (dependency.attributes) {
        Object.entries(dependency.attributes).forEach(([key, value]) => {
          script.setAttribute(key, value);
        });
      }

      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => reject(new Error(`[hyper-frame] Failed to load script ${dependency.url}`)), {
        once: true,
      });

      document.head.appendChild(script);
    });
  }

  private injectStyle(dependency: ExternalDependency): Promise<void> {
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('[hyper-frame] document is not available'));
    }

    const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).find(
      (link) => link.href === dependency.url,
    );
    if (existing) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = dependency.url;
      link.dataset.hyperFrame = 'external';

      if (dependency.attributes) {
        Object.entries(dependency.attributes).forEach(([key, value]) => {
          link.setAttribute(key, value);
        });
      }

      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => reject(new Error(`[hyper-frame] Failed to load stylesheet ${dependency.url}`)), {
        once: true,
      });

      document.head.appendChild(link);
    });
  }
}
