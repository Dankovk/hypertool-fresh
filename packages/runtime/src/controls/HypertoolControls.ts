import { Pane } from 'tweakpane';
import type {
  ControlDefinitions,
  HypertoolControlsOptions,
  ControlPosition,
  ParameterValues,
  ControlChangeContext,
  FolderDefinition,
  ButtonDefinition,
  TabDefinition,
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
   * Check if a definition is a folder
   */
  private isFolder(definition: any): definition is FolderDefinition {
    return definition && typeof definition === 'object' && (definition.type === 'folder' || definition.type === 'group');
  }

  /**
   * Check if a definition is a button
   */
  private isButton(definition: any): definition is ButtonDefinition {
    return definition && typeof definition === 'object' && definition.type === 'button';
  }

  /**
   * Check if a definition is a tab
   */
  private isTab(definition: any): definition is TabDefinition {
    return definition && typeof definition === 'object' && definition.type === 'tab';
  }

  /**
   * Extract initial parameter values from control definitions
   */
  private extractInitialValues(definitions: any): any {
    const params: any = {};
    for (const [key, definition] of Object.entries(definitions)) {
      const def = definition as any;
      if (this.isFolder(def)) {
        // Recursively extract values from folder controls
        params[key] = this.extractInitialValues(def.controls);
      } else if (this.isTab(def)) {
        // Extract values from each tab page
        params[key] = def.pages.map((page: any) => this.extractInitialValues(page.controls));
      } else if (this.isButton(def)) {
        // Buttons don't have values, skip
        continue;
      } else {
        params[key] = def.value;
      }
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

      // // Position the pane
      // this.positionPane();

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
    // Add controls-container class for styling
    this.pane.element.parentElement?.classList.add('controls-container');
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
   * Add controls to the pane based on definitions
   */
  private addControls() {
    if (!this.pane) return;
    this.addControlsToTarget(this.pane, this.definitions, this.params);
  }

  /**
   * Add controls to a specific target (pane or folder)
   */
  private addControlsToTarget(target: any, definitions: ControlDefinitions, params: any) {
    for (const [key, definition] of Object.entries(definitions)) {
      try {
        if (this.isFolder(definition)) {
          // Create folder
          const folderConfig: any = {
            title: definition.label || key,
          };
          if (definition.expanded !== undefined) {
            folderConfig.expanded = definition.expanded;
          }
          const folder = target.addFolder(folderConfig);
          
          // Recursively add controls to folder
          this.addControlsToTarget(folder, definition.controls, params[key]);
        } else if (this.isButton(definition)) {
          // Create button
          const buttonConfig: any = {
            title: definition.title,
          };
          if (definition.label) {
            buttonConfig.label = definition.label;
          }
          const button = target.addButton(buttonConfig);
          
          // Attach click handler
          if (definition.onClick) {
            button.on('click', definition.onClick);
          }
        } else if (this.isTab(definition)) {
          // Create tab
          const tabConfig: any = {
            pages: definition.pages.map((page: any) => ({ title: page.title })),
          };
          const tab = target.addTab(tabConfig);
          
          // Add controls to each page
          definition.pages.forEach((page: any, index: number) => {
            this.addControlsToTarget(tab.pages[index], page.controls, params[key][index]);
          });
        } else {
          // Add regular control
          this.addControlToTarget(target, key, definition, params);
        }
      } catch (error) {
        console.error(`[HypertoolControls] Error adding control/folder/button/tab "${key}":`, error);
      }
    }
  }

  /**
   * Add a single control to a target (pane or folder)
   */
  private addControlToTarget(target: any, key: string, definition: any, params: any) {
    // Skip if it's a folder (should not be called with folders)
    if (this.isFolder(definition)) return;

    const config: any = {
      label: definition.label || key,
    };
    console.log(definition)

    // Monitor-specific configuration (readonly: true makes it a monitor)
    if (definition.readonly !== undefined) {
      config.readonly = definition.readonly;
    }
    if (definition.interval !== undefined) {
      config.interval = definition.interval;
    }
    if (definition.bufferSize !== undefined) {
      config.bufferSize = definition.bufferSize;
    }
    
    // String monitor options
    if (definition.multiline !== undefined) {
      config.multiline = definition.multiline;
    }
    if (definition.rows !== undefined) {
      config.rows = definition.rows;
    }
    
    // Number monitor options (graph view)
    if (definition.view !== undefined) {
      config.view = definition.view;
    }

    // Type-specific configuration
    switch (definition.type) {
      case 'number':
        if (definition.min !== undefined) config.min = definition.min;
        if (definition.max !== undefined) config.max = definition.max;
        if (definition.step !== undefined) config.step = definition.step;
        break;

      case 'point':
      case 'point2d':
      case 'point3d':
      case 'point4d':
        // Explicit point type - handle constraints
        if (definition.min !== undefined) config.min = definition.min;
        if (definition.max !== undefined) config.max = definition.max;
        if (definition.step !== undefined) config.step = definition.step;

        // Per-axis constraints
        const axes = ['x', 'y', 'z', 'w'];
        for (const axis of axes) {
          if ((definition as any)[axis] && typeof (definition as any)[axis] === 'object') {
            config[axis] = (definition as any)[axis];
          }
        }
        break;

      case 'select':
      case 'selector':
        console.log(`[HypertoolControls] Adding select control "${key}":`, definition);
        // Always convert to Tweakpane array format: [{text: 'Label', value: 'value'}, ...]
        if (Array.isArray(definition.options)) {
          config.options = definition.options.map((opt: any) => {
            // Handle array of objects: [{label: 'X', value: 'x'}] or [{text: 'X', value: 'x'}]
            if (typeof opt === 'object' && opt !== null) {
              return {
                text: opt.label || opt.text || String(opt.value),
                value: opt.value
              };
            }
            // Handle simple array: ['x', 'y', 'z']
            return {
              text: String(opt),
              value: opt
            };
          });
        } else {
          // Convert object format {Label: 'value'} to array format
          config.options = Object.entries(definition.options).map(([text, value]) => ({
            text,
            value
          }));
        }
        console.log('[HypertoolControls] Select options for', key, ':', config.options);
        break;

      case 'color':
      case 'boolean':
      case 'string':
      case 'text':
        // No additional config needed - Tweakpane handles these automatically
        break;

      case 'folder':
      case 'group':
        // Folders are handled by addControlsToTarget, this should not be reached
        console.warn(`[HypertoolControls] Folder/Group encountered in addControlToTarget (should be handled earlier)`);
        return;

      case 'button':
        // Buttons are handled by addControlsToTarget, this should not be reached
        console.warn(`[HypertoolControls] Button encountered in addControlToTarget (should be handled earlier)`);
        return;

      case 'tab':
        // Tabs are handled by addControlsToTarget, this should not be reached
        console.warn(`[HypertoolControls] Tab encountered in addControlToTarget (should be handled earlier)`);
        return;

      default:
        console.warn(`[HypertoolControls] Unknown control type: ${(definition as any).type}`);
        return;
    }

    // Add binding to the target (pane or folder)
    const binding = target.addBinding(params, key, config);

    // Listen for changes
    binding.on('change', (event: any) => {
      // Update the nested params object
      params[key] = event.value;
      
      // Notify onChange callback with full params
      const context: ControlChangeContext<T> = {
        key: key as keyof T,
        value: event.value,
        event,
      };
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
