import { HypertoolControls } from './HypertoolControls';
import type { ControlDefinitions, HypertoolControlsOptions, ParameterValues } from './types';

/**
 * Simple API for quick setup - returns params object directly
 *
 * @example
 * ```typescript
 * const params = createControls({
 *   speed: { type: 'number', value: 1, min: 0, max: 10, step: 0.1 },
 *   color: { type: 'color', value: '#ff0000' },
 *   enabled: { type: 'boolean', value: true }
 * });
 *
 * // Use params directly in your code
 * circle.speed = params.speed;
 * circle.color = params.color;
 * ```
 */
export function createControls<T extends ControlDefinitions>(
  definitions: T,
  options?: HypertoolControlsOptions
): ParameterValues<T> {
  const controls = new HypertoolControls(definitions, options);
  return controls.params;
}

/**
 * Advanced API for full control - returns HypertoolControls instance
 *
 * @example
 * ```typescript
 * const controls = createControlPanel({
 *   speed: { type: 'number', value: 1, min: 0, max: 10 }
 * }, {
 *   title: 'Simulation',
 *   onChange: (params) => console.log('Changed:', params)
 * });
 *
 * // Access params
 * const params = controls.params;
 *
 * // Programmatically update
 * controls.set('speed', 5);
 *
 * // Hide/show
 * controls.setVisible(false);
 * ```
 */
export function createControlPanel<T extends ControlDefinitions>(
  definitions: T,
  options?: HypertoolControlsOptions
): HypertoolControls<T> {
  return new HypertoolControls(definitions, options);
}
