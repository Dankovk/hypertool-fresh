const CLONE_ATTRIBUTE = 'data-hyper-frame-clone';
const SUPPORTED_NODE_NAMES = new Set(['STYLE', 'LINK']);

interface CssBridgeOptions {
  sourceDocument?: Document | null;
  targetDocument?: Document | null;
  mirror?: boolean;
}

type NodeMapping = WeakMap<Node, Node>;

export class CssBridge {
  private source: Document | null;
  private target: Document | null;
  private observer: MutationObserver | null = null;
  private nodeMap: NodeMapping = new WeakMap();
  private active = false;

  constructor(options: CssBridgeOptions = {}) {
    this.source = options.sourceDocument ?? (typeof window !== 'undefined' ? window.parent?.document ?? null : null);
    this.target = options.targetDocument ?? (typeof document !== 'undefined' ? document : null);
    this.active = Boolean(options.mirror ?? true);
  }

  start() {
    if (!this.active) return;
    if (!this.source || !this.target) {
      console.warn('[hyper-frame] Unable to mirror CSS – missing source or target document.');
      return;
    }

    this.cleanupPreviousClones();
    this.syncAll();
    this.attachObserver();
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.nodeMap = new WeakMap();
    this.cleanupPreviousClones();
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
