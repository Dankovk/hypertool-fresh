const CLONE_ATTRIBUTE = 'data-hyper-frame-clone';
const SUPPORTED_NODE_NAMES = new Set(['STYLE', 'LINK']);

// Export for use by parent window CSS sync senders
export const CSS_SYNC_MESSAGE_TYPE = 'hyper-frame:css-sync';

interface CssBridgeOptions {
  sourceDocument?: Document | null;
  targetDocument?: Document | null;
  mirror?: boolean;
}

interface CssSyncMessage {
  type: typeof CSS_SYNC_MESSAGE_TYPE;
  action: 'init' | 'add' | 'remove' | 'update';
  id?: string;
  tagName?: string;
  attributes?: Record<string, string>;
  textContent?: string;
}

type NodeMapping = WeakMap<Node, Node>;

export class CssBridge {
  private source: Document | null;
  private target: Document | null;
  private observer: MutationObserver | null = null;
  private nodeMap: NodeMapping = new WeakMap();
  private active = false;
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private usePostMessage = false;
  private cssNodesById = new Map<string, HTMLElement>();

  constructor(options: CssBridgeOptions = {}) {
    // Try to access parent document, but handle cross-origin errors gracefully
    let sourceDoc: Document | null = null;
    if (options.sourceDocument) {
      sourceDoc = options.sourceDocument;
    } else if (typeof window !== 'undefined') {
      try {
        // This will throw SecurityError if cross-origin
        sourceDoc = window.parent?.document ?? null;
      } catch (error) {
        // Cross-origin access blocked - use postMessage instead
        console.debug('[hyper-frame] Using postMessage for CSS sync (cross-origin)');
        this.usePostMessage = true;
        sourceDoc = null;
      }
    }

    this.source = sourceDoc;
    this.target = options.targetDocument ?? (typeof document !== 'undefined' ? document : null);
    this.active = Boolean(options.mirror ?? true);
  }

  start() {
    if (!this.active) return;

    if (this.usePostMessage) {
      // Use postMessage for cross-origin CSS sync
      this.startPostMessageMode();
    } else if (this.source && this.target) {
      // Use direct DOM access for same-origin
      this.cleanupPreviousClones();
      this.syncAll();
      this.attachObserver();
    } else {
      console.warn('[hyper-frame] Unable to mirror CSS – missing source or target document.');
    }
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.nodeMap = new WeakMap();
    this.cleanupPreviousClones();

    if (this.messageListener && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }

    this.cssNodesById.clear();
  }

  private startPostMessageMode() {
    if (!this.target || typeof window === 'undefined') return;

    this.cleanupPreviousClones();

    this.messageListener = (event: MessageEvent) => {
      if (!event.data || event.data.type !== CSS_SYNC_MESSAGE_TYPE) return;
      this.handleCssMessage(event.data as CssSyncMessage);
    };

    window.addEventListener('message', this.messageListener);
    console.debug('[hyper-frame] CSS postMessage receiver ready');
  }

  private handleCssMessage(message: CssSyncMessage) {
    if (!this.target) return;

    switch (message.action) {
      case 'init':
        // Initial CSS sync - clear and prepare
        this.cleanupPreviousClones();
        this.cssNodesById.clear();
        break;

      case 'add':
        if (message.id && message.tagName) {
          this.addCssNode(message.id, message.tagName, message.attributes, message.textContent);
        }
        break;

      case 'remove':
        if (message.id) {
          this.removeCssNode(message.id);
        }
        break;

      case 'update':
        if (message.id) {
          this.updateCssNode(message.id, message.attributes, message.textContent);
        }
        break;
    }
  }

  private addCssNode(id: string, tagName: string, attributes?: Record<string, string>, textContent?: string) {
    if (!this.target) return;
    if (this.cssNodesById.has(id)) return; // Already exists

    const element = document.createElement(tagName);
    element.setAttribute(CLONE_ATTRIBUTE, 'true');
    element.setAttribute('data-css-id', id);

    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
      }
    }

    if (textContent) {
      element.textContent = textContent;
    }

    this.target.head.appendChild(element);
    this.cssNodesById.set(id, element);
  }

  private removeCssNode(id: string) {
    const element = this.cssNodesById.get(id);
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
      this.cssNodesById.delete(id);
    }
  }

  private updateCssNode(id: string, attributes?: Record<string, string>, textContent?: string) {
    const element = this.cssNodesById.get(id);
    if (!element) return;

    if (attributes) {
      // Remove old attributes except special ones
      for (const attr of Array.from(element.attributes)) {
        if (!attr.name.startsWith('data-')) {
          element.removeAttribute(attr.name);
        }
      }

      // Set new attributes
      for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
      }
    }

    if (textContent !== undefined) {
      element.textContent = textContent;
    }
  }

  private cleanupPreviousClones() {
    if (!this.target) return;
    this.target
      .querySelectorAll(`[${CLONE_ATTRIBUTE}="true"]`)
      .forEach((node) => node.parentNode?.removeChild(node));
  }

  private syncAll() {
    if (!this.source || !this.target) return;
    const head = this.source.head;
    const nodes = Array.from(head.children).filter((node) => SUPPORTED_NODE_NAMES.has(node.nodeName));

    nodes.forEach((node) => {
      const clone = this.cloneNode(node);
      if (!clone) return;
      this.target?.head.appendChild(clone);
      this.nodeMap.set(node, clone);
    });
  }

  private attachObserver() {
    if (!this.source || !this.target) return;
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        switch (mutation.type) {
          case 'childList':
            this.handleChildListMutation(mutation);
            break;
          case 'characterData':
            this.handleCharacterDataMutation(mutation);
            break;
          case 'attributes':
            this.handleAttributeMutation(mutation);
            break;
        }
      });
    });

    this.observer.observe(this.source.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
  }

  private handleChildListMutation(mutation: MutationRecord) {
    if (!this.target) return;

    mutation.removedNodes.forEach((node) => {
      const mapped = this.nodeMap.get(node);
      if (mapped && mapped.parentNode) {
        mapped.parentNode.removeChild(mapped);
        this.nodeMap.delete(node);
      }
    });

    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!SUPPORTED_NODE_NAMES.has(node.nodeName)) return;

      const clone = this.cloneNode(node);
      if (!clone) return;

      const reference = mutation.nextSibling ? this.nodeMap.get(mutation.nextSibling) : null;
      if (reference && reference.parentNode) {
        reference.parentNode.insertBefore(clone, reference);
      } else {
        this.target?.head.appendChild(clone);
      }

      this.nodeMap.set(node, clone);
    });
  }

  private handleCharacterDataMutation(mutation: MutationRecord) {
    const targetNode = mutation.target;
    const parent = targetNode.parentNode;
    if (!parent) return;
    const mappedParent = this.nodeMap.get(parent);
    if (!mappedParent) return;

    mappedParent.textContent = parent.textContent;
  }

  private handleAttributeMutation(mutation: MutationRecord) {
    const target = mutation.target as Element;
    const mapped = this.nodeMap.get(target);
    if (!mapped || !(mapped instanceof Element)) return;

    if (mutation.attributeName) {
      const value = target.getAttribute(mutation.attributeName);
      if (value === null) {
        mapped.removeAttribute(mutation.attributeName);
      } else {
        mapped.setAttribute(mutation.attributeName, value);
      }
    }
  }

  private cloneNode(node: Node): HTMLElement | null {
    if (!(node instanceof HTMLElement)) return null;
    if (!SUPPORTED_NODE_NAMES.has(node.nodeName)) return null;

    const clone = node.cloneNode(true) as HTMLElement;
    clone.setAttribute(CLONE_ATTRIBUTE, 'true');
    return clone;
  }
}
