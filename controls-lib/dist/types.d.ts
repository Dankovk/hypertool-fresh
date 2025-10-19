/**
 * Control definition types
 */
export type ControlType = 'number' | 'color' | 'boolean' | 'string' | 'select';
export interface BaseControlDefinition {
    label?: string;
    value: any;
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
    type: 'string';
    value: string;
}
export interface SelectControlDefinition extends BaseControlDefinition {
    type: 'select';
    value: string | number;
    options: Record<string, string | number> | Array<string | number>;
}
export type ControlDefinition = NumberControlDefinition | ColorControlDefinition | BooleanControlDefinition | StringControlDefinition | SelectControlDefinition;
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
    [K in keyof T]: T[K]['value'];
};
//# sourceMappingURL=types.d.ts.map