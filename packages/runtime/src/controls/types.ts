/**
 * Control definition types
 */

export type ControlType = 'number' | 'color' | 'boolean' | 'string' | 'text' | 'select' | 'selector' | 'point' | 'point2d' | 'point3d' | 'point4d' | 'folder' | 'group' | 'button' | 'tab';

export interface BaseControlDefinition {
  type?: ControlType; // Optional - auto-detected from value for points
  label?: string;
  value?: any; // Optional for folders
  
  // Monitor-specific properties (when readonly: true)
  readonly?: boolean; // Makes this a monitor instead of an input
  interval?: number; // Update interval in milliseconds (default: 200)
  bufferSize?: number; // Buffer size for monitors
  
  // String monitor options
  multiline?: boolean; // Multiline display for string monitors
  rows?: number; // Number of rows for multiline monitors
  
  // Number monitor options
  view?: 'graph'; // Graph view for number monitors
}

export interface NumberControlDefinition extends BaseControlDefinition {
  type: 'number';
  value: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface ColorControlDefinition extends BaseControlDefinition {
  type: 'color';
  value: string;
}

export interface BooleanControlDefinition extends BaseControlDefinition {
  type: 'boolean';
  value: boolean;
}

export interface StringControlDefinition extends BaseControlDefinition {
  type: 'string' | 'text'; // Support both 'string' and 'text' as aliases
  value: string;
}

export interface SelectControlDefinition extends BaseControlDefinition {
  type: 'select' | 'selector';
  value: string | number;
  options:
    | Record<string, string | number> // {Label: 'value'}
    | Array<string | number> // ['value1', 'value2']
    | Array<{label?: string; text?: string; value: string | number}>; // [{label: 'Label', value: 'value'}]
}

export interface AxisConstraints {
  min?: number;
  max?: number;
  step?: number;
  inverted?: boolean; // For Y-axis inversion
}

// Point controls - can be explicitly typed or auto-detected by Tweakpane from value structure
export interface Point2DControlDefinition extends BaseControlDefinition {
  type?: 'point' | 'point2d'; // Optional - can be auto-detected from value
  value: { x: number; y: number };
  // Constraints (can be global or per-axis objects)
  min?: number | { x: number; y: number };
  max?: number | { x: number; y: number };
  step?: number | { x: number; y: number };
  // Per-axis constraints (Tweakpane format)
  x?: AxisConstraints;
  y?: AxisConstraints;
}

export interface Point3DControlDefinition extends BaseControlDefinition {
  type?: 'point' | 'point3d'; // Optional - can be auto-detected from value
  value: { x: number; y: number; z: number };
  // Constraints (can be global or per-axis objects)
  min?: number | { x: number; y: number; z: number };
  max?: number | { x: number; y: number; z: number };
  step?: number | { x: number; y: number; z: number };
  // Per-axis constraints (Tweakpane format)
  x?: AxisConstraints;
  y?: AxisConstraints;
  z?: AxisConstraints;
}

export interface Point4DControlDefinition extends BaseControlDefinition {
  type?: 'point' | 'point4d'; // Optional - can be auto-detected from value
  value: { x: number; y: number; z: number; w: number };
  // Constraints (can be global or per-axis objects)
  min?: number | { x: number; y: number; z: number; w: number };
  max?: number | { x: number; y: number; z: number; w: number };
  step?: number | { x: number; y: number; z: number; w: number };
  // Per-axis constraints (Tweakpane format)
  x?: AxisConstraints;
  y?: AxisConstraints;
  z?: AxisConstraints;
  w?: AxisConstraints;
}

// Folder definition for organizing controls
export interface FolderDefinition extends BaseControlDefinition {
  type: 'folder' | 'group';
  value?: never; // Folders don't have values
  expanded?: boolean;
  controls: ControlDefinitions;
}

// Button definition for triggering actions
export interface ButtonDefinition extends BaseControlDefinition {
  type: 'button';
  value?: never; // Buttons don't have values
  title: string; // Button text
  onClick?: () => void; // Click handler
}

// Tab page definition
export interface TabPage {
  title: string;
  controls: ControlDefinitions;
}

// Tab definition for organizing controls in tabs
export interface TabDefinition extends BaseControlDefinition {
  type: 'tab';
  value?: never; // Tabs don't have values
  pages: TabPage[];
}

export type ControlDefinition =
  | NumberControlDefinition
  | ColorControlDefinition
  | BooleanControlDefinition
  | StringControlDefinition
  | SelectControlDefinition
  | Point2DControlDefinition
  | Point3DControlDefinition
  | Point4DControlDefinition
  | FolderDefinition
  | ButtonDefinition
  | TabDefinition;

export type ControlDefinitions = Record<string, ControlDefinition>;

export type ControlPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface ControlChangeContext<T extends ControlDefinitions = ControlDefinitions> {
  key: keyof T;
  value: any;
  event: any;
}

export interface HypertoolControlsOptions<T extends ControlDefinitions = ControlDefinitions> {
  title?: string;
  position?: ControlPosition;
  expanded?: boolean;
  container?: HTMLElement | string | null;
  onChange?: (params: ParameterValues<T>, context: ControlChangeContext<T>) => void;
  onReady?: () => void;
}

export type ParameterValues<T extends ControlDefinitions> = {
  [K in keyof T]: T[K] extends FolderDefinition 
    ? ParameterValues<T[K]['controls']>
    : T[K] extends TabDefinition
    ? any[] // Array of page parameter values
    : T[K] extends ButtonDefinition
    ? never // Buttons don't have values
    : T[K] extends { value: infer V } 
    ? V 
    : never;
};
