const CSS_SYNC_MESSAGE_TYPE = 'hyper-frame:css-sync';
const SUPPORTED_NODE_NAMES = new Set(['STYLE', 'LINK']);

interface CssSyncMessage {
  type: typeof CSS_SYNC_MESSAGE_TYPE;
  action: 'init' | 'add' | 'remove' | 'update';
  id?: string;
  tagName?: string;
  attributes?: Record<string, string>;
  textContent?: string;
}

type NodeIdMap = WeakMap<Node, string>;

export class CssSyncManager {
  private observer: MutationObserver | null = null;
  private nodeIds: NodeIdMap = new WeakMap();
  private nextId = 0;
  private targetWindow: Window | null = null;
  private targetOrigin = '*';

  constructor(private sourceDocument: Document = document) {}

  start(iframeWindow: Window, targetOrigin = '*') {
    this.stop(); // Clean up any existing observer

    this.targetWindow = iframeWindow;
    this.targetOrigin = targetOrigin;

    // Send initial CSS state
    this.sendInitialCss();

    // Watch for future changes
    this.attachObserver();

    console.debug('[CssSyncManager] Started CSS sync');
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.nodeIds = new WeakMap();
    this.nextId = 0;
    this.targetWindow = null;
  }

  private async sendInitialCss() {
    if (!this.targetWindow) return;

    // Send init message
    this.postMessage({ type: CSS_SYNC_MESSAGE_TYPE, action: 'init' });

    // Send all current CSS nodes
    const head = this.sourceDocument.head;
    const nodes = Array.from(head.children).filter((node) =>
      SUPPORTED_NODE_NAMES.has(node.nodeName)
    );

    // Send nodes sequentially to maintain order
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const id = this.getOrCreateNodeId(node);
      await this.sendAddMessage(node, id);
    }
  }

  private attachObserver() {
    if (this.observer || !this.sourceDocument) return;

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

    this.observer.observe(this.sourceDocument.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
  }

  private handleChildListMutation(mutation: MutationRecord) {
    mutation.removedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!SUPPORTED_NODE_NAMES.has(node.nodeName)) return;

      const id = this.nodeIds.get(node);
      if (id) {
        this.postMessage({
          type: CSS_SYNC_MESSAGE_TYPE,
          action: 'remove',
          id,
        });
      }
    });

    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (!SUPPORTED_NODE_NAMES.has(node.nodeName)) return;

      const id = this.getOrCreateNodeId(node);
      // Fire and forget - we don't want to block mutations
      this.sendAddMessage(node, id).catch((error) => {
        console.error('[CssSyncManager] Failed to send add message:', error);
      });
    });
  }

  private handleCharacterDataMutation(mutation: MutationRecord) {
    const parent = mutation.target.parentNode;
    if (!parent || !(parent instanceof HTMLElement)) return;
    if (!SUPPORTED_NODE_NAMES.has(parent.nodeName)) return;

    const id = this.nodeIds.get(parent);
    if (!id) return;

    this.postMessage({
      type: CSS_SYNC_MESSAGE_TYPE,
      action: 'update',
      id,
      textContent: parent.textContent ?? '',
    });
  }

  private handleAttributeMutation(mutation: MutationRecord) {
    const target = mutation.target;
    if (!(target instanceof HTMLElement)) return;
    if (!SUPPORTED_NODE_NAMES.has(target.nodeName)) return;

    const id = this.nodeIds.get(target);
    if (!id) return;

    this.postMessage({
      type: CSS_SYNC_MESSAGE_TYPE,
      action: 'update',
      id,
      attributes: this.getAttributes(target),
    });
  }

  private async sendAddMessage(node: HTMLElement, id: string) {
    // For LINK tags, handle differently based on rel type
    if (node.tagName === 'LINK' && node instanceof HTMLLinkElement) {
      const href = node.getAttribute('href');
      const rel = node.getAttribute('rel');

      if (href) {
        // For stylesheet links, fetch and inline the CSS
        if (rel === 'stylesheet') {
          try {
            const cssContent = await this.fetchCssContent(href);
            // Send as a STYLE tag with inline CSS
            this.postMessage({
              type: CSS_SYNC_MESSAGE_TYPE,
              action: 'add',
              id,
              tagName: 'STYLE',
              attributes: {},
              textContent: cssContent,
            });
            return;
          } catch (error) {
            console.error(`[CssSyncManager] Failed to fetch CSS from ${href}:`, error);
            // Fall through to send with absolute URL
          }
        }

        // For non-stylesheet links (preload, etc.), convert href to absolute URL
        const attributes = this.getAttributes(node);
        try {
          const absoluteUrl = new URL(href, window.location.href).href;
          attributes['href'] = absoluteUrl;
        } catch (error) {
          console.error(`[CssSyncManager] Failed to convert URL to absolute: ${href}`, error);
        }

        this.postMessage({
          type: CSS_SYNC_MESSAGE_TYPE,
          action: 'add',
          id,
          tagName: node.tagName,
          attributes,
          textContent: node.textContent ?? '',
        });
        return;
      }
    }

    // For STYLE tags or LINK tags without href, send as-is
    this.postMessage({
      type: CSS_SYNC_MESSAGE_TYPE,
      action: 'add',
      id,
      tagName: node.tagName,
      attributes: this.getAttributes(node),
      textContent: node.textContent ?? '',
    });
  }

  private async fetchCssContent(href: string): Promise<string> {
    // Convert relative URLs to absolute
    const absoluteUrl = new URL(href, window.location.href).href;

    const response = await fetch(absoluteUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  private getOrCreateNodeId(node: Node): string {
    let id = this.nodeIds.get(node);
    if (!id) {
      id = `css-${this.nextId++}`;
      this.nodeIds.set(node, id);
    }
    return id;
  }

  private getAttributes(element: HTMLElement): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const attr of Array.from(element.attributes)) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  private postMessage(message: CssSyncMessage) {
    if (!this.targetWindow) return;

    try {
      this.targetWindow.postMessage(message, this.targetOrigin);
    } catch (error) {
      console.error('[CssSyncManager] Failed to send message:', error);
    }
  }
}
