import { VIRTUAL_PATH } from "@hypertool/shared-config/paths";
import { getRuntimeFileMap } from "./fileUtils.js";
import { convexClient } from "./convex.js";

type FileMap = Record<string, string>;

interface ScriptDescriptor {
  src: string;
  module?: boolean;
}

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
}

// Import generated data files for runtime only (boilerplates now come from Convex)
const RUNTIME_DATA = await import('../data/runtime-data.js');

const isDevelopment = process.env.NODE_ENV !== 'production';
console.log(`[boilerplate] Loading boilerplates from Convex DB, using ${isDevelopment ? 'dynamic' : 'pre-generated'} runtime data`);

/**
 * Load boilerplate files from Convex DB
 * @param presetId - Preset ID to load (defaults to 'universal')
 * @returns FileMap with boilerplate files enriched with runtime
 */
export async function loadBoilerplateFromConvex(presetId: string = 'universal'): Promise<FileMap> {
  const CONVEX_URL = process.env.CONVEX_URL || "";
  
  if (!CONVEX_URL) {
    throw new Error("CONVEX_URL environment variable is not set. Cannot load boilerplates from Convex.");
  }

  try {
    const boilerplate = await convexClient.query('boilerplates:getBoilerplate', {
      presetId,
    });

    if (!boilerplate || !boilerplate.files) {
      throw new Error(`Boilerplate not found in Convex: ${presetId}`);
    }

    // Enrich with runtime library from local codebase
    return ensureSystemFiles(boilerplate.files);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load boilerplate from Convex (${presetId}): ${errorMessage}`);
  }
}

/**
 * List available presets from Convex DB
 * @returns Array of preset info
 */
export async function listAvailablePresetsFromConvex(): Promise<PresetInfo[]> {
  const CONVEX_URL = process.env.CONVEX_URL || "";
  
  if (!CONVEX_URL) {
    throw new Error("CONVEX_URL environment variable is not set. Cannot load presets from Convex.");
  }

  try {
    const presets = await convexClient.query('boilerplates:listPresets', {});
    
    if (!presets || presets.length === 0) {
      throw new Error("No presets found in Convex DB");
    }

    return presets.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load presets from Convex: ${errorMessage}`);
  }
}

// Legacy functions - deprecated, kept for backward compatibility during migration
// These will be removed once all code is migrated to Convex
export function loadBoilerplateFiles(presetId?: string): FileMap {
  throw new Error("loadBoilerplateFiles() is deprecated. Use loadBoilerplateFromConvex() instead.");
}

export function listAvailablePresets(): PresetInfo[] {
  throw new Error("listAvailablePresets() is deprecated. Use listAvailablePresetsFromConvex() instead.");
}

function injectRuntimeLibrary(files: FileMap): ScriptDescriptor | null {
  try {
    // Load unified runtime bundle (dynamically from disk in dev, pre-generated in production)
    const bundles = loadRuntimeBundles();
    Object.assign(files, bundles);
    return { src: "./__hypertool__/index.js", module: true };
  } catch (error) {
    console.error("[boilerplate] Failed to inject runtime library:", error);
    return null;
  }
}

function injectLibraryScripts(html: string, scriptSources: ScriptDescriptor[]): string {
  let output = html;
  const mainScriptPatterns = [
    '<script type="module" src="./main.jsx"></script>',
    '<script type="module" src="./main.js"></script>',
  ];

  for (const descriptor of scriptSources) {
    if (output.includes(descriptor.src)) {
      continue;
    }

    const scriptTag = descriptor.module === false
      ? `    <script src="${descriptor.src}"></script>`
      : `    <script type="module" src="${descriptor.src}"></script>`;

    // Try to inject before main script (tsx or ts)
    let injected = false;
    for (const mainScriptTag of mainScriptPatterns) {
      if (output.includes(mainScriptTag)) {
        output = output.replace(mainScriptTag, `${scriptTag}\n    ${mainScriptTag}`);
        injected = true;
        break;
      }
    }

    if (injected) {
      continue;
    }

    // Fallback: inject before </body>
    if (output.includes("</body>")) {
      output = output.replace("</body>", `${scriptTag}\n</body>`);
      continue;
    }

    // Last resort: append at end
    output = `${output.trim()}\n${scriptTag}\n`;
  }

  return output;
}

export function ensureSystemFiles(original: FileMap): FileMap {
  const files = { ...original };
  const scriptSources: ScriptDescriptor[] = [];

  // Inject unified runtime bundle (contains both controls and frame)
  const runtimeScript = injectRuntimeLibrary(files);
  if (runtimeScript) {
    scriptSources.push(runtimeScript);
  }

  if (files["/index.html"] && scriptSources.length > 0) {
    files["/index.html"] = injectLibraryScripts(files["/index.html"], scriptSources);
  }

  return files;
}

export function loadRuntimeBundles(): FileMap {
  // In development, read fresh runtime files from disk to pick up hot reload changes
  // In production, use pre-generated data for better performance
  if (isDevelopment) {
    try {
      const runtimeData = getRuntimeFileMap();
      return runtimeData.files;
    } catch (error) {
      console.error('[boilerplate] Failed to load runtime from disk, falling back to pre-generated:', error);
      return RUNTIME_DATA.loadRuntimeBundles();
    }
  }

  return RUNTIME_DATA.loadRuntimeBundles();
}
