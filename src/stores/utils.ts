/**
 * Store utility functions for advanced Zustand patterns
 */

import type { StateCreator } from "zustand";

/**
 * Creates a reset function that resets multiple stores to initial state
 */
export function createResetFn(...resetFns: (() => void)[]) {
  return () => {
    resetFns.forEach((fn) => fn());
  };
}

/**
 * Shallow equality check for store selectors
 * Prevents unnecessary re-renders when selecting multiple values
 *
 * @example
 * const { model, apiKey } = useSettingsStore(
 *   (state) => ({ model: state.model, apiKey: state.apiKey }),
 *   shallow
 * );
 */
export function shallow<T>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is(objA[key as keyof T], objB[key as keyof T])
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Logger middleware for debugging store changes
 * Only active in development
 *
 * @example
 * export const useMyStore = create<MyStore>()(
 *   logger(
 *     (set) => ({
 *       // store implementation
 *     }),
 *     'MyStore'
 *   )
 * );
 */
export const logger =
  <T>(
    config: StateCreator<T>,
    name?: string
  ): StateCreator<T> =>
  (set, get, api) => {
    const loggerSet: typeof set = (partial, replace) => {
      if (process.env.NODE_ENV === "development") {
        const prevState = get();
        set(partial, replace);
        const nextState = get();
        console.group(`🔵 ${name || "Store"} Update`);
        console.log("Previous:", prevState);
        console.log("Next:", nextState);
        console.groupEnd();
      } else {
        set(partial, replace);
      }
    };

    return config(loggerSet, get, api);
  };

/**
 * Helper to create typed selectors for better intellisense
 *
 * @example
 * export const selectSettings = createSelector((state: SettingsStore) => ({
 *   model: state.model,
 *   apiKey: state.apiKey
 * }));
 */
export function createSelector<T, R>(selector: (state: T) => R) {
  return selector;
}

/**
 * Debounce utility for throttling store updates
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Compose multiple middleware functions
 */
export function compose<T>(...fns: Array<(x: T) => T>) {
  return (x: T) => fns.reduceRight((acc, fn) => fn(acc), x);
}
