import { VIRTUAL_PATH } from "@hypertool/shared-config/paths";
import { getRuntimeFileMap } from "./fileUtils.js";

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

// Import generated data files (must exist - run 'bun run transform:boilerplate' and 'bun run transform:runtime' first)
const BOILERPLATE_DATA = await import('./boilerplate-data.js');
const RUNTIME_DATA = await import('./runtime-data.js');

const isDevelopment = process.env.NODE_ENV !== 'production';
console.log(`[boilerplate] Using pre-generated boilerplate data and ${isDevelopment ? 'dynamic' : 'pre-generated'} runtime data`);

export function loadBoilerplateFiles(presetId?: string): FileMap {
  const files = BOILERPLATE_DATA.loadBoilerplateFiles(presetId);
  return ensureSystemFiles(files);
}

export function listAvailablePresets(): PresetInfo[] {
  return BOILERPLATE_DATA.listAvailablePresets();
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
