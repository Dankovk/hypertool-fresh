// Type definitions for Hypertool runtime
declare module "./__hypertool__" {
  export function createSandbox(options: HyperFrameSandboxOptions): Promise<HyperFrameSandboxHandle>;

  export interface HyperFrameSandboxOptions {
    name?: string;
    mirrorCss?: boolean;
    controls?: {
      definitions: ControlDefinitions;
      options?: ControlPanelOptions;
      onChange?: SandboxControlChangeHandler;
    };
    exportWidget?: {
      enabled?: boolean;
      filename?: string;
      useCanvasCapture?: boolean;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    setup(context: SandboxContext): Promise<void | (() => void)> | void | (() => void);
  }

  export interface HyperFrameSandboxHandle {
    destroy(): void;
    container: HTMLElement;
    controls: SandboxControlsHandle | null;
    params: Record<string, any>;
  }
}

// Global type declarations
declare global {
  type ControlType = "number" | "color" | "boolean" | "text" | "select";

  interface BaseControlDefinition {
    type: ControlType;
    label: string;
  }

  interface NumberControlDefinition extends BaseControlDefinition {
    type: "number";
    value: number;
    min?: number;
    max?: number;
    step?: number;
  }

  interface ColorControlDefinition extends BaseControlDefinition {
    type: "color";
    value: string;
  }

  interface BooleanControlDefinition extends BaseControlDefinition {
    type: "boolean";
    value: boolean;
  }

  interface StringControlDefinition extends BaseControlDefinition {
    type: "text";
    value: string;
  }

  interface SelectControlDefinition extends BaseControlDefinition {
    type: "select";
    value: string;
    options: string[] | { value: string; label: string }[];
  }

  type ControlDefinition =
    | NumberControlDefinition
    | ColorControlDefinition
    | BooleanControlDefinition
    | StringControlDefinition
    | SelectControlDefinition;

  type ControlDefinitions = Record<string, ControlDefinition>;

  interface ControlChangePayload {
    key: string;
    value: any;
    event: any;
  }

  interface ControlPanelOptions {
    title?: string;
    position?: string;
    expanded?: boolean;
    container?: HTMLElement | string | null;
    onChange?: (change: ControlChangePayload, context: SandboxContext) => void;
  }

  interface SandboxControlsHandle {
    params: Record<string, any>;
    destroy?(): void;
    dispose?(): void;
    [key: string]: any;
  }

  type SandboxControlChangeHandler = (
    change: ControlChangePayload,
    context: SandboxContext
  ) => void;

  interface SandboxExportsApi {
    registerImageCapture(handler: any): void;
    registerVideoCapture(handler: any): void;
    setFilename(filename: string): void;
    setVisible(visible: boolean): void;
    useDefaultCanvasCapture(enable?: boolean): void;
    destroy(): void;
  }

  interface SandboxEnvironment {
    window: Window;
    document: Document;
    addCleanup(cleanup: () => void): void;
    onResize(handler: () => void, options?: AddEventListenerOptions): () => void;
  }

  interface SandboxContext {
    mount: HTMLElement;
    params: Record<string, any>;
    controls: SandboxControlsHandle | null;
    exports: SandboxExportsApi;
    runtime: any;
    environment: SandboxEnvironment;
  }
}

export {};
