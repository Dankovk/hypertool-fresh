import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

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

const DEFAULT_RELATIVE_PATH = "boilerplate-presets/three.js";
const PRESETS_RELATIVE_PATH = "boilerplate-presets";
const FALLBACK_RELATIVE_PATHS = [
  "./boilerplate-presets/three.js",
  "../boilerplate-presets/circle",
  "../../boilerplate-presets/circle",
    "../../boilerplate-presets/three.js",
  "./boilerplate-presets",
  "../boilerplate-presets",
  "../../boilerplate-presets",
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
          console.log(packageJson)
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

const RUNTIME_DIST_RELATIVE_PATH = "hyper-runtime/dist/index.js";
const RUNTIME_BUNDLE_PATH = "/__hypertool__/runtime/index.js";
const RUNTIME_GLOBALS_PATH = "/__hypertool__/runtime/globals.js";
const LEGACY_CONTROLS_MODULE_PATH = "/__hypertool__/controls/index.js";
const LEGACY_FRAME_MODULE_PATH = "/__hypertool__/frame/index.js";
const LEGACY_CONTROLS_GLOBALS_PATH = "/__hypertool__/controls/globals.js";
const LEGACY_FRAME_GLOBALS_PATH = "/__hypertool__/frame/globals.js";

const RUNTIME_REEXPORT_CODE = 'export * from "../runtime/index.js";\n';
const LEGACY_GLOBAL_FORWARD_CODE = 'import "../runtime/globals.js";\n';

function createRuntimeGlobals(): string {
  return `
import * as runtime from "./index.js";

if (typeof window !== "undefined") {
  const existingRuntime = window.hyperRuntime || {};
  const existingFrame = window.hyperFrame || {};
  const existingControls = window.hypertoolControls || {};

  const controls = {
    createControls: runtime.createControls,
    createControlPanel: runtime.createControlPanel,
    HypertoolControls: runtime.HypertoolControls,
    injectThemeVariables: runtime.injectThemeVariables,
    studioTheme: runtime.studioTheme,
  };

  const p5 = {
    mount: runtime.mountP5Sketch,
    run: runtime.runP5Sketch,
    start: runtime.startP5Sketch,
  };

  const three = {
    mount: runtime.mountThreeSketch,
    run: runtime.runThreeSketch,
    start: runtime.startThreeSketch,
  };

  window.hyperRuntime = Object.assign({}, existingRuntime, runtime, {
    controls: Object.assign({}, existingRuntime.controls || {}, controls),
    frame: Object.assign({}, existingRuntime.frame || {}, {
      mountP5Sketch: runtime.mountP5Sketch,
      runP5Sketch: runtime.runP5Sketch,
      startP5Sketch: runtime.startP5Sketch,
      mountThreeSketch: runtime.mountThreeSketch,
      runThreeSketch: runtime.runThreeSketch,
      startThreeSketch: runtime.startThreeSketch,
    }),
  });

  window.hypertoolControls = Object.assign({}, existingControls, controls);

  window.hyperFrame = Object.assign({}, existingFrame, {
    mountP5Sketch: runtime.mountP5Sketch,
    runP5Sketch: runtime.runP5Sketch,
    startP5Sketch: runtime.startP5Sketch,
    mountThreeSketch: runtime.mountThreeSketch,
    runThreeSketch: runtime.runThreeSketch,
    startThreeSketch: runtime.startThreeSketch,
    p5: Object.assign({}, existingFrame.p5 || {}, p5),
    three: Object.assign({}, existingFrame.three || {}, three),
  });
}
`.trimStart();
}

export function loadRuntimeVirtualFiles(): FileMap | null {
  try {
    const distPath = resolve(process.cwd(), RUNTIME_DIST_RELATIVE_PATH);
    if (!existsSync(distPath)) {
      console.warn(`[boilerplate] Runtime dist not found at ${distPath}`);
      return null;
    }

    const distCode = readFileSync(distPath, "utf8");

    return {
      [RUNTIME_BUNDLE_PATH]: distCode,
      [RUNTIME_GLOBALS_PATH]: createRuntimeGlobals(),
      [LEGACY_CONTROLS_MODULE_PATH]: RUNTIME_REEXPORT_CODE,
      [LEGACY_FRAME_MODULE_PATH]: RUNTIME_REEXPORT_CODE,
      [LEGACY_CONTROLS_GLOBALS_PATH]: LEGACY_GLOBAL_FORWARD_CODE,
      [LEGACY_FRAME_GLOBALS_PATH]: LEGACY_GLOBAL_FORWARD_CODE,
    } satisfies FileMap;
  } catch (error) {
    console.error("[boilerplate] Failed to build runtime files:", error);
    return null;
  }
}

function injectRuntimeLibrary(files: FileMap): ScriptDescriptor | null {
  const runtimeFiles = loadRuntimeVirtualFiles();
  if (!runtimeFiles) {
    return null;
  }

  Object.assign(files, runtimeFiles);
  return { src: "./__hypertool__/runtime/globals.js", module: true };
}

function injectLibraryScripts(html: string, scriptSources: ScriptDescriptor[]): string {
  let output = html;
  const mainScriptTag = '<script type="module" src="./main.tsx"></script>';

  for (const descriptor of scriptSources) {
    if (output.includes(descriptor.src)) {
      continue;
    }

    const scriptTag = descriptor.module === false
      ? `    <script src="${descriptor.src}"></script>`
      : `    <script type="module" src="${descriptor.src}"></script>`;

    if (output.includes(mainScriptTag)) {
      output = output.replace(mainScriptTag, `${scriptTag}\n    ${mainScriptTag}`);
      continue;
    }

    if (output.includes("</body>")) {
      output = output.replace("</body>", `${scriptTag}\n</body>`);
      continue;
    }

    output = `${output.trim()}\n${scriptTag}\n`;
  }

  return output;
}

export function ensureSystemFiles(original: FileMap): FileMap {
  const files = { ...original };
  const scriptSources: ScriptDescriptor[] = [];

  const runtimeScript = injectRuntimeLibrary(files);
  if (runtimeScript) {
    scriptSources.push(runtimeScript);
  }

  if (files["/index.html"] && scriptSources.length > 0) {
    files["/index.html"] = injectLibraryScripts(files["/index.html"], scriptSources);
  }

  return files;
}
