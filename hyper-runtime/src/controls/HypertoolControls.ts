import { Pane } from 'tweakpane';
import type {
  ControlDefinitions,
  HypertoolControlsOptions,
  ControlPosition,
  ParameterValues,
  ControlChangeContext,
} from './types';
import { injectThemeVariables } from './theme';

/**
 * HypertoolControls - A styled Tweakpane wrapper that inherits Studio theme
 */
export class HypertoolControls<T extends ControlDefinitions = ControlDefinitions> {
  private declare pane: Pane | null;
  private declare definitions: T;
  private declare options: Required<HypertoolControlsOptions<T>>;
  public declare params: ParameterValues<T>;

  constructor(definitions: T, options: HypertoolControlsOptions<T> = {}) {
    this.pane = null;
    this.definitions = definitions;
    this.options = {
      title: options.title || 'Controls',
      position: options.position || 'top-right',
      expanded: options.expanded !== undefined ? options.expanded : true,
      container: options.container !== undefined ? options.container : null,
      onChange: options.onChange || (() => {}),
      onReady: options.onReady || (() => {}),
    } satisfies Required<HypertoolControlsOptions<T>>;

    // Initialize params from definitions
    this.params = this.extractInitialValues(definitions);

    // Initialize the control panel
    this.init();
  }

  /**
   * Extract initial parameter values from control definitions
   */
  private extractInitialValues(definitions: T): ParameterValues<T> {
    const params = {} as ParameterValues<T>;
    for (const [key, definition] of Object.entries(definitions)) {
      params[key as keyof T] = definition.value;
    }
    return params;
  }

  /**
   * Initialize Tweakpane with theme and controls
   */
  private async init() {
    try {
      // Inject theme CSS variables
      injectThemeVariables();

      // Small delay to ensure theme is applied
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create Tweakpane instance
      this.createPane();

      // Position the pane
      this.positionPane();

      // Add controls
      this.addControls();

      // Notify ready
      this.options.onReady();

      console.log('[HypertoolControls] Initialized successfully');
    } catch (error) {
      console.error('[HypertoolControls] Initialization error:', error);
    }
  }

  /**
   * Create the Tweakpane instance
   */
  private createPane() {
    const container = this.resolveContainer();
    const paneOptions: Record<string, unknown> = {
      title: this.options.title,
      expanded: this.options.expanded,
    };

    if (container) {
      paneOptions.container = container;
    }

    this.pane = new Pane(paneOptions);
  }

  /**
   * Resolve the container element if provided
   */
  private resolveContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;

    const containerOption = this.options.container;

    if (!containerOption) return null;

    if (containerOption instanceof HTMLElement) {
      return containerOption;
    }

    const element = document.querySelector(containerOption);

    if (!element) {
      console.warn(`[HypertoolControls] Container selector "${containerOption}" did not match any elements`);
      return null;
    }

    return element as HTMLElement;
  }

  /**
   * Position the pane in the viewport
   */
  private positionPane() {
    if (!this.pane || this.options.container) return;

    const container = this.pane.element;
    container.style.position = 'fixed';
    container.style.zIndex = '10000';

    const positions: Record<ControlPosition, () => void> = {
      'top-right': () => {
        container.style.top = '20px';
        container.style.right = '20px';
      },
      'top-left': () => {
        container.style.top = '20px';
        container.style.left = '20px';
      },
      'bottom-right': () => {
        container.style.bottom = '20px';
        container.style.right = '20px';
      },
      'bottom-left': () => {
        container.style.bottom = '20px';
        container.style.left = '20px';
      },
    };

    positions[this.options.position]();
  }

  /**
   * Add controls to the pane based on definitions
   */
  private addControls() {
    if (!this.pane) return;

    for (const [key, definition] of Object.entries(this.definitions)) {
      try {
        this.addControl(key, definition);
      } catch (error) {
        console.error(`[HypertoolControls] Error adding control "${key}":`, error);
      }
    }
  }

  /**
   * Add a single control to the pane
   */
  private addControl(key: string, definition: ControlDefinitions[string]) {
    if (!this.pane) return;

    const config: any = {
      label: definition.label || key,
    };

    // Type-specific configuration
    switch (definition.type) {
      case 'number':
        if (definition.min !== undefined) config.min = definition.min;
        if (definition.max !== undefined) config.max = definition.max;
        if (definition.step !== undefined) config.step = definition.step;
        break;

      case 'select':
        config.options = definition.options;
        break;

      case 'color':
      case 'boolean':
      case 'string':
        // No additional config needed
        break;

      default:
        console.warn(`[HypertoolControls] Unknown control type: ${(definition as any).type}`);
        return;
    }

    // Add binding
    const binding = (this.pane as any).addBinding(this.params, key, config);

    // Listen for changes
    binding.on('change', (event: any) => {
      const typedKey = key as keyof T;
      this.params[typedKey] = event.value;
      const context: ControlChangeContext<T> = {
        key: typedKey,
        value: event.value,
        event,
      };

      // Notify onChange callback
      this.options.onChange(this.values, context);
    });
  }

  /**
   * Add a folder to organize controls
   */
  public addFolder(title: string): any {
    if (!this.pane) return null;
    return (this.pane as any).addFolder({ title });
  }

  /**
   * Update a parameter value programmatically
   */
  public set(key: keyof T, value: any) {
    if (key in this.params) {
      this.params[key] = value;
      if (this.pane) {
        (this.pane as any).refresh();
      }
    }
  }

  /**
   * Get current parameter values
   */
  public get values(): ParameterValues<T> {
    return { ...this.params };
  }

  /**
   * Destroy the control panel
   */
  public destroy() {
    if (this.pane) {
      this.pane.dispose();
      this.pane = null;
    }

    // Remove theme styles
    const themeStyle = document.getElementById('hypertool-theme');
    if (themeStyle) {
      themeStyle.remove();
    }
  }

  /**
   * Show/hide the control panel
   */
  public setVisible(visible: boolean) {
    if (!this.pane) return;
    this.pane.element.style.display = visible ? 'block' : 'none';
  }

  /**
   * Refresh the control panel UI
   */
  public refresh() {
    if (this.pane) {
      (this.pane as any).refresh();
    }
  }
}
