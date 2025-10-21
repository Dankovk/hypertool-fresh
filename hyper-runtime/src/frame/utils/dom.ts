export interface ResolvedContainer {
  element: HTMLElement;
  createdInternally: boolean;
}

export interface ResolveContainerOptions {
  target?: HTMLElement | string | null;
  containerClassName?: string;
  documentRef?: Document;
}

export function resolveContainer(options: ResolveContainerOptions = {}): ResolvedContainer {
  const doc = options.documentRef ?? document;
  if (!doc) {
    throw new Error('[hyper-frame] document is not available');
  }

  const className = options.containerClassName || 'hypertool-sketch';
  const target = options.target;

  if (target instanceof HTMLElement) {
    target.classList.add(className);
    return { element: target, createdInternally: false };
  }

  if (typeof target === 'string' && target.trim().length > 0) {
    const node = doc.querySelector<HTMLElement>(target);
    if (node) {
      node.classList.add(className);
      return { element: node, createdInternally: false };
    }
    console.warn(`[hyper-frame] Could not find container for selector "${target}", creating one instead.`);
  }

  const container = doc.createElement('div');
  container.classList.add(className);
  doc.body.appendChild(container);
  return { element: container, createdInternally: true };
}
