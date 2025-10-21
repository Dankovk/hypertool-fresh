export interface ResolvedContainer {
  element: HTMLElement;
  createdInternally: boolean;
}

export interface ResolveContainerOptions {
  target?: HTMLElement | string | null;
  className?: string;
}

export function resolveContainer(options: ResolveContainerOptions = {}): ResolvedContainer {
  if (typeof document === 'undefined') {
    throw new Error('[hyper-frame] document is not available');
  }

  const className = options.className && options.className.trim().length > 0
    ? options.className
    : 'hyperframe-root';

  const target = options.target;

  if (target instanceof HTMLElement) {
    target.classList.add(className);
    return { element: target, createdInternally: false };
  }

  if (typeof target === 'string' && target.trim().length > 0) {
    const element = document.querySelector<HTMLElement>(target);
    if (element) {
      element.classList.add(className);
      return { element, createdInternally: false };
    }
    console.warn(`[hyper-frame] Could not find container for selector "${target}", creating one instead.`);
  }

  const container = document.createElement('div');
  container.classList.add(className);
  document.body.appendChild(container);
  return { element: container, createdInternally: true };
}
