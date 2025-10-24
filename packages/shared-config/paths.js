/**
 * Centralized path configuration for hyper-runtime builds
 *
 * This ensures consistency across:
 * - Build output (hyper-runtime/build-dev.config.ts)
 * - Bundle loading (backend/src/lib/boilerplate.ts)
 * - File watching (backend/src/routes/runtime-watch.ts)
 */

/**
 * Relative path from backend/ to hyper-runtime build output
 * Used by boilerplate.ts and runtime-watch.ts (which run from backend/)
 */
 const HYPER_RUNTIME_DIST_FROM_BACKEND_DEV = "node_modules/@hypertool/runtime/dist";
 const HYPER_RUNTIME_DIST_FROM_BACKEND_PROD = "deps/runtime/dist"

export const HYPER_RUNTIME_DIST_FROM_BACKEND = process.env.NODE_ENV === "development" ? HYPER_RUNTIME_DIST_FROM_BACKEND_DEV : HYPER_RUNTIME_DIST_FROM_BACKEND_PROD;
/**
 * Relative path from hyper-runtime/ to backend output location
 * Used by build-dev.config.ts (which runs from hyper-runtime/)
 */
export const HYPER_RUNTIME_DIST_FROM_SOURCE = "../../backend/hyper-runtime";

/**
 * Unified bundle path (single file containing both controls and frame)
 */
export const BUNDLE_PATH = "index.js";

/**
 * Virtual path for serving the unified runtime bundle
 */
export const VIRTUAL_PATH = "/__hypertool__/index.js";
