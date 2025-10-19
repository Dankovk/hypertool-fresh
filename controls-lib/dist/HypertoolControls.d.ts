import type { ControlDefinitions, HypertoolControlsOptions, ParameterValues } from './types';
/**
 * HypertoolControls - A styled Tweakpane wrapper that inherits Studio theme
 */
export declare class HypertoolControls<T extends ControlDefinitions = ControlDefinitions> {
    private pane;
    private definitions;
    private options;
    params: ParameterValues<T>;
    constructor(definitions: T, options?: HypertoolControlsOptions<T>);
    /**
     * Extract initial parameter values from control definitions
     */
    private extractInitialValues;
    /**
     * Initialize Tweakpane with theme and controls
     */
    private init;
    /**
     * Create the Tweakpane instance
     */
    private createPane;
    /**
     * Resolve the container element if provided
     */
    private resolveContainer;
    /**
     * Position the pane in the viewport
     */
    private positionPane;
    /**
     * Add controls to the pane based on definitions
     */
    private addControls;
    /**
     * Add a single control to the pane
     */
    private addControl;
    /**
     * Add a folder to organize controls
     */
    addFolder(title: string): any;
    /**
     * Update a parameter value programmatically
     */
    set(key: keyof T, value: any): void;
    /**
     * Get current parameter values
     */
    get values(): ParameterValues<T>;
    /**
     * Destroy the control panel
     */
    destroy(): void;
    /**
     * Show/hide the control panel
     */
    setVisible(visible: boolean): void;
    /**
     * Refresh the control panel UI
     */
    refresh(): void;
}
//# sourceMappingURL=HypertoolControls.d.ts.map