import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HYPER_RUNTIME_DIST_FROM_BACKEND, BUNDLE_PATH, VIRTUAL_PATH } from "@hypertool/shared-config/paths";

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

// Import generated boilerplate data (must exist - run 'bun run transform:boilerplate' first)
const BOILERPLATE_DATA = await import('./boilerplate-data.js');
console.log('[boilerplate] Using pre-generated boilerplate data');

// Backend runs from backend/ directory, so go up one level to project root
const currentDir = process.cwd()
const pathToRootDir = resolve(currentDir);

export function loadBoilerplateFiles(presetId?: string): FileMap {
  const files = BOILERPLATE_DATA.loadBoilerplateFiles(presetId);
  return ensureSystemFiles(files);
}

export function listAvailablePresets(): PresetInfo[] {
  return BOILERPLATE_DATA.listAvailablePresets();
}

function injectRuntimeLibrary(files: FileMap): ScriptDescriptor | null {
  try {
    // Load unified runtime bundle (includes both controls and frame with globals setup)
    const bundlePath = resolve(pathToRootDir, join(HYPER_RUNTIME_DIST_FROM_BACKEND, BUNDLE_PATH));
    if (!existsSync(bundlePath)) {
      console.warn(`[boilerplate] Runtime bundle not found at ${bundlePath}`);
      return null;
    }
    const bundleCode = readFileSync(bundlePath, "utf8");
    console.log(`[boilerplate] Loaded runtime bundle: ${bundleCode.length} bytes`);
    files[VIRTUAL_PATH] = bundleCode;

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
  const files = ensureSystemFiles({});
  return Object.fromEntries(
    Object.entries(files).filter(([path]) => path.startsWith("/__hypertool__/")),
  );
}
