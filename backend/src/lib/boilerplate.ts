import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HYPER_RUNTIME_DIST_FROM_BACKEND, BUNDLE_PATH, VIRTUAL_PATH } from "@hypertool/shared-config/paths";

type FileMap = Record<string, string>;

interface ScriptDescriptor {
  src: string;
  module?: boolean;
}

interface PresetInfo {
  id: string;
  name: string;
  description: string;
}

// Backend runs from backend/ directory, so go up one level to project root
const currentDir = process.cwd()
const pathToRootDir = resolve(currentDir);

const DEFAULT_RELATIVE_PATH = "./public/boilerplate-presets/universal";
const PRESETS_RELATIVE_PATH = "./public/boilerplate-presets";
const FALLBACK_RELATIVE_PATHS = [
  "../boilerplate-presets/universal",
  "../../boilerplate-presets/universal",
  "./boilerplate-presets/universal",
  "../boilerplate-presets",
  "../../boilerplate-presets",
  "./boilerplate-presets",
];

export function resolveBoilerplatePath(): string {
  const cwd = process.cwd();
  const candidatePaths = [DEFAULT_RELATIVE_PATH, ...FALLBACK_RELATIVE_PATHS];

  for (const relativePath of candidatePaths) {
    const candidate = resolve(cwd, relativePath);
    if (existsSync(candidate) && existsSync(join(candidate, "index.html"))) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate boilerplate project from cwd: ${cwd}`);
}

export function resolvePresetsPath(): string | null {
  const cwd = process.cwd();
  const candidate = resolve(cwd, PRESETS_RELATIVE_PATH);
  if (existsSync(candidate)) {
    return candidate;
  }
  return null;
}

export function readDirectoryRecursive(dir: string, base: string = dir, out: FileMap = {}): FileMap {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      readDirectoryRecursive(full, base, out);
    } else {
      const rel = full.replace(base + "/", "");
      out["/" + rel] = readFileSync(full, "utf8");
    }
  }
  return out;
}

export function loadBoilerplateFiles(presetId?: string): FileMap {
  let files: FileMap | null = null;

  if (presetId) {
    const presetsPath = resolvePresetsPath();
    if (presetsPath) {
      const presetPath = join(presetsPath, presetId);
      if (existsSync(presetPath) && existsSync(join(presetPath, "index.html"))) {
        files = readDirectoryRecursive(presetPath);
      }
    }
  }

  if (!files) {
    const boilerplatePath = resolveBoilerplatePath();
    files = readDirectoryRecursive(boilerplatePath);
  }

  return ensureSystemFiles(files);
}

export function listAvailablePresets(): PresetInfo[] {
  const presetsPath = resolvePresetsPath();
  if (!presetsPath) {
    return [];
  }

  const presets: PresetInfo[] = [];
  const entries = readdirSync(presetsPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '__non-migrated__') {
      const presetPath = join(presetsPath, entry.name);
      const packageJsonPath = join(presetPath, "package.json");

      let name = entry.name;
      let description = "";

      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
          name = packageJson.name || entry.name;
          description = packageJson.description || "";
        } catch (e) {
          // Ignore invalid package.json
        }
      }



      presets.push({
        id: entry.name,
        name,
        description,
      });
    }
  }

  return presets;
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
