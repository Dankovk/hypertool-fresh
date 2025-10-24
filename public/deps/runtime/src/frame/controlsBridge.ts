import type {
  ControlDefinitions,
  ControlPanelOptions,
  ControlChangePayload,
  SandboxContext,
} from './types';

interface HypertoolControlsApi {
  createControlPanel: (
    definitions: ControlDefinitions,
    options: {
      title?: string;
      position?: string;
      expanded?: boolean;
      container?: HTMLElement | string | null;
      onChange?: (params: Record<string, any>, context: any) => void;
    },
  ) => {
    params: Record<string, any>;
    dispose: () => void;
  } & Record<string, any>;
}

export interface ControlsBridgeInitOptions {
  definitions: ControlDefinitions;
  options?: ControlPanelOptions;
  context: SandboxContext;
  onControlChange?: (change: ControlChangePayload) => void;
}

export class ControlsBridge {
  private controlsApi: HypertoolControlsApi;

  constructor() {
    this.controlsApi = this.resolveControlsApi();
  }

  private resolveControlsApi(): HypertoolControlsApi {
    if (typeof window === 'undefined') {
      throw new Error('[hyper-frame] window is not available');
    }
    const hyperWindow = window as unknown as { hypertoolControls?: HypertoolControlsApi };
    if (!hyperWindow.hypertoolControls) {
      throw new Error('[hyper-frame] hypertool controls are not available on window');
    }
    return hyperWindow.hypertoolControls;
  }

  init(options: ControlsBridgeInitOptions) {

    const panelOptions = options.options || {};
    const controls = this.controlsApi.createControlPanel(options.definitions, {
      title: panelOptions.title,
      position: panelOptions.position,
      expanded: panelOptions.expanded,
      container: panelOptions.container,
      onChange: (params: Record<string, any>, changeContext: any) => {
        const change: ControlChangePayload = {
          key: changeContext.key,
          value: changeContext.value,
          event: changeContext.event,
        };

        options.onControlChange?.(change);

        if (typeof panelOptions.onChange === 'function') {
          panelOptions.onChange(change, options.context);
        }
      },
    });

    return controls;
  }
}
