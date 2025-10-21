import {
  HyperFrameControlRuntime,
  HyperFrameControlSetup,
  HyperFrameContext,
  HyperFrameMessageHandler,
  HyperFrameRenderer,
  HyperFrameRendererContext,
  HyperFrameRendererSession,
  HyperFrameSession,
  HyperFrameStartOptions,
  ControlChangePayload,
} from './types';
import { resolveContainer } from './dom';
import { ParentStyleMirror, syncParentStyles } from './styleSync';

interface HyperFrameRuntimeOptions {
  autoSyncParentStyles?: boolean;
  defaultContainerClassName?: string;
}

interface ContextRef {
  current: HyperFrameContext | null;
}

interface ActiveSession {
  container: HTMLElement;
  createdInternally: boolean;
  controlRuntime: HyperFrameControlRuntime | null;
  rendererSession: HyperFrameRendererSession | null;
  context: HyperFrameContext;
}

type ListenerMap = Map<string, Set<HyperFrameMessageHandler>>;

function getHypertoolControls(): any {
  if (typeof window === 'undefined') {
    throw new Error('[hyper-frame] window is not available');
  }

  const hyperWindow = window as unknown as {
    hypertoolControls?: any;
  };

  if (!hyperWindow.hypertoolControls) {
    throw new Error('[hyper-frame] hypertool controls are not available on window');
  }

  return hyperWindow.hypertoolControls;
}

function nextFrame(callback: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 16);
  }
}

function waitForCondition(condition: () => boolean, maxAttempts: number, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function tick() {
      attempts += 1;

      try {
        if (condition()) {
          resolve();
          return;
        }
      } catch (error) {
        // ignore errors from condition evaluation and keep waiting
      }

      if (attempts >= maxAttempts) {
        reject(new Error(`[hyper-frame] Timed out waiting for ${label}`));
        return;
      }

      nextFrame(tick);
    }

    tick();
  });
}

async function ensureControlsReady(maxAttempts: number): Promise<void> {
  await waitForCondition(() => {
    try {
      getHypertoolControls();
      return true;
    } catch (error) {
      return false;
    }
  }, maxAttempts, 'hypertool controls');
}

async function initializeControls(
  setup: HyperFrameControlSetup,
  contextRef: ContextRef,
  readinessAttempts: number
): Promise<HyperFrameControlRuntime> {
  await ensureControlsReady(readinessAttempts);
  const controlsApi = getHypertoolControls();
  const baseOptions = setup.options || {};

  const controlInstance = controlsApi.createControlPanel(setup.definitions, {
    title: baseOptions.title,
    position: baseOptions.position,
    expanded: baseOptions.expanded,
    container: baseOptions.container,
    onChange: (params: Record<string, any>, changeContext: any) => {
      if (contextRef.current) {
        contextRef.current.params = params;
        if (typeof baseOptions.onChange === 'function') {
          const payload: ControlChangePayload = {
            key: changeContext.key,
            value: changeContext.value,
            event: changeContext.event,
          };
          try {
            baseOptions.onChange(payload, contextRef.current);
          } catch (error) {
            console.error('[hyper-frame] Error in control change handler:', error);
          }
        }
      }
    },
  });

  return {
    params: controlInstance.params,
    controls: controlInstance,
    destroy: () => {
      if (typeof controlInstance.destroy === 'function') {
        controlInstance.destroy();
      }
    },
  };
}

export class HyperFrameRuntime {
  private readonly renderers = new Map<string, HyperFrameRenderer<any>>();
  private readonly listeners: ListenerMap = new Map();
  private readonly options: HyperFrameRuntimeOptions;
  private styleMirror: ParentStyleMirror | null = null;
  private activeSession: ActiveSession | null = null;
  private readyAttempts = 600;

  constructor(options: HyperFrameRuntimeOptions = {}) {
    this.options = options;
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        this.handleIncomingMessage(event.data);
      });
    }
  }

  registerRenderer<TOptions = Record<string, unknown>>(renderer: HyperFrameRenderer<TOptions>): void {
    this.renderers.set(renderer.id, renderer as HyperFrameRenderer<any>);
  }

  unregisterRenderer(id: string): void {
    this.renderers.delete(id);
  }

  listRenderers(): string[] {
    return Array.from(this.renderers.keys());
  }

  syncParentStyles(force = false): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.styleMirror && !force) {
      return;
    }

    this.styleMirror = syncParentStyles(document);
  }

  onMessage(type: string, handler: HyperFrameMessageHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  sendMessage(type: string, payload?: unknown): void {
    this.emitLocal(type, payload);
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(
          {
            source: 'hyperframe-runtime',
            type,
            payload,
          },
          '*'
        );
      } catch (error) {
        console.warn('[hyper-frame] Failed to post message to parent window:', error);
      }
    }
  }

  async start<TOptions = Record<string, unknown>>(options: HyperFrameStartOptions<TOptions>): Promise<HyperFrameSession> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('[hyper-frame] HyperFrameRuntime can only run in a browser environment');
    }

    if (this.options.autoSyncParentStyles !== false || options.syncParentStyles) {
      this.syncParentStyles();
    }

    const rendererId = options.renderer;
    const renderer = rendererId ? this.renderers.get(rendererId) : null;

    if (rendererId && !renderer) {
      throw new Error(`[hyper-frame] Renderer "${rendererId}" is not registered`);
    }

    const resolveOptions = {
      target: options.target,
      className: options.containerClassName || this.options.defaultContainerClassName,
    };

    const containerInfo = resolveContainer(resolveOptions);
    const contextRef: ContextRef = { current: null };

    const controlRuntime = options.controls
      ? await initializeControls(options.controls, contextRef, this.readyAttempts)
      : null;

    const params = controlRuntime ? controlRuntime.params : {};
    const controls = controlRuntime ? controlRuntime.controls : null;

    const environment = { window, document };

    const context: HyperFrameContext = {
      params,
      controls,
      container: containerInfo.element,
      environment,
      metadata: options.metadata,
      rendererOptions: (options.rendererOptions || {}) as Record<string, unknown>,
      sendMessage: (type: string, payload?: unknown) => this.sendMessage(type, payload),
      onMessage: (type: string, handler: HyperFrameMessageHandler) => this.onMessage(type, handler),
    };

    contextRef.current = context;

    if (renderer && typeof renderer.prepare === 'function') {
      await renderer.prepare(options.rendererOptions as TOptions);
    }

    let rendererSession: HyperFrameRendererSession | null = null;

    if (renderer) {
      const result = await renderer.mount({
        ...context,
        options: (options.rendererOptions || {}) as TOptions,
      } as HyperFrameRendererContext<TOptions>);
      rendererSession = result || null;
    }

    if (this.activeSession) {
      this.activeSession.rendererSession?.destroy?.();
      this.activeSession.controlRuntime?.destroy();
      if (this.activeSession.createdInternally) {
        this.activeSession.container.remove();
      }
    }

    const activeSession: ActiveSession = {
      container: containerInfo.element,
      createdInternally: containerInfo.createdInternally,
      controlRuntime,
      rendererSession,
      context,
    };

    this.activeSession = activeSession;
    this.sendMessage('ready', {
      params,
      metadata: options.metadata || null,
      renderer: rendererId || null,
    });

    return {
      params,
      controls,
      container: containerInfo.element,
      metadata: options.metadata,
      destroy: () => this.destroyActiveSession(activeSession),
      update: rendererSession?.update?.bind(rendererSession),
      getInstance: rendererSession?.getInstance?.bind(rendererSession),
    };
  }

  private destroyActiveSession(session: ActiveSession): void {
    session.rendererSession?.destroy?.();
    session.controlRuntime?.destroy();
    if (session.createdInternally) {
      session.container.remove();
    }
    if (this.activeSession === session) {
      this.activeSession = null;
    }
  }

  private emitLocal(type: string, payload?: unknown) {
    const handlers = this.listeners.get(type);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error('[hyper-frame] Error in message handler:', error);
      }
    });
  }

  private handleIncomingMessage(data: any) {
    if (!data || typeof data !== 'object') {
      return;
    }

    const message = data as { source?: string; type?: string; payload?: unknown };

    if (message.source && message.source !== 'hypertool-studio' && message.source !== 'hyperframe-host') {
      return;
    }

    if (!message.type) {
      return;
    }

    this.emitLocal(message.type, message.payload);
  }
}

export function createHyperFrameRuntime(options: HyperFrameRuntimeOptions = {}): HyperFrameRuntime {
  return new HyperFrameRuntime(options);
}
