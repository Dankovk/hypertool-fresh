interface StyleMirrorOptions {
  sourceDocument?: Document | null;
}

interface MirrorMapping {
  clone: Element;
  sourceId: string;
}

export class ParentStyleMirror {
  private observer: MutationObserver | null = null;
  private readonly mappings = new Map<Element, MirrorMapping>();
  private readonly reverseMappings = new Map<string, Element>();
  private readonly anchor: Comment;
  private running = false;
  private sourceDocument: Document | null = null;
  private sourceIdCounter = 0;

  constructor(private readonly targetDocument: Document) {
    this.anchor = targetDocument.createComment('hyperframe-style-anchor');
    targetDocument.head.appendChild(this.anchor);
  }

  start(options: StyleMirrorOptions = {}): void {
    if (this.running) {
      return;
    }

    const source = options.sourceDocument ?? this.tryResolveParentDocument();
    if (!source) {
      console.warn('[hyper-frame] Unable to access parent document styles.');
      return;
    }

    this.sourceDocument = source;
    this.running = true;
    this.copyInitialNodes(source);
    this.observeSource(source);
  }

  stop(): void {
    this.running = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.mappings.clear();
    this.reverseMappings.clear();
    this.sourceDocument = null;
  }

  private tryResolveParentDocument(): Document | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      if (!window.parent || window.parent === window) {
        return null;
      }
      return window.parent.document;
    } catch (error) {
      console.warn('[hyper-frame] Accessing parent document styles is not permitted:', error);
      return null;
    }
  }

  private copyInitialNodes(source: Document): void {
    const nodes = source.querySelectorAll('link[rel="stylesheet"], style');
    nodes.forEach((node) => {
      if (node instanceof HTMLLinkElement || node instanceof HTMLStyleElement) {
        this.ensureMirror(node);
      }
    });
  }

  private observeSource(source: Document): void {
    if (typeof MutationObserver === 'undefined') {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLLinkElement || node instanceof HTMLStyleElement) {
              this.ensureMirror(node);
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLLinkElement || node instanceof HTMLStyleElement) {
              this.removeMirror(node);
            }
          });
        }

        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target instanceof HTMLLinkElement || target instanceof HTMLStyleElement) {
            this.updateMirror(target);
          }
        }

        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          if (parent instanceof HTMLStyleElement) {
            this.updateMirror(parent);
          }
        }
      });
    });

    this.observer.observe(source.documentElement, {
      attributes: true,
      attributeFilter: ['href', 'media', 'disabled', 'integrity', 'crossorigin', 'referrerpolicy'],
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  private ensureMirror(sourceNode: HTMLLinkElement | HTMLStyleElement): void {
    const mapping = this.mappings.get(sourceNode);
    if (mapping) {
      this.updateMirror(sourceNode);
      return;
    }

    const clone = this.targetDocument.createElement(sourceNode.tagName.toLowerCase());
    clone.setAttribute('data-hyperframe-clone', 'true');
    const sourceId = this.createSourceId();
    clone.setAttribute('data-hyperframe-source', sourceId);

    this.applyAttributes(sourceNode, clone);

    if (clone instanceof HTMLStyleElement && sourceNode instanceof HTMLStyleElement) {
      clone.textContent = sourceNode.textContent;
    }

    this.targetDocument.head.insertBefore(clone, this.anchor);
    this.mappings.set(sourceNode, { clone, sourceId });
    this.reverseMappings.set(sourceId, clone);
  }

  private removeMirror(sourceNode: HTMLLinkElement | HTMLStyleElement): void {
    const mapping = this.mappings.get(sourceNode);
    if (!mapping) {
      return;
    }

    mapping.clone.remove();
    this.mappings.delete(sourceNode);
    this.reverseMappings.delete(mapping.sourceId);
  }

  private updateMirror(sourceNode: HTMLLinkElement | HTMLStyleElement): void {
    const mapping = this.mappings.get(sourceNode);
    if (!mapping) {
      this.ensureMirror(sourceNode);
      return;
    }

    const { clone } = mapping;
    this.applyAttributes(sourceNode, clone);

    if (clone instanceof HTMLStyleElement && sourceNode instanceof HTMLStyleElement) {
      if (clone.textContent !== sourceNode.textContent) {
        clone.textContent = sourceNode.textContent;
      }
    }
  }

  private applyAttributes(source: HTMLLinkElement | HTMLStyleElement, target: Element): void {
    const cloneAttributes = new Set<string>();
    for (let i = 0; i < target.attributes.length; i += 1) {
      cloneAttributes.add(target.attributes[i].name);
    }

    Array.from(source.attributes).forEach((attribute) => {
      target.setAttribute(attribute.name, attribute.value);
      cloneAttributes.delete(attribute.name);
    });

    cloneAttributes.forEach((name) => {
      if (name.startsWith('data-hyperframe')) {
        return;
      }
      target.removeAttribute(name);
    });
  }

  private createSourceId(): string {
    this.sourceIdCounter += 1;
    return `hf-style-${this.sourceIdCounter}`;
  }
}

export function syncParentStyles(targetDocument: Document, options: StyleMirrorOptions = {}): ParentStyleMirror {
  const mirror = new ParentStyleMirror(targetDocument);
  mirror.start(options);
  return mirror;
}
