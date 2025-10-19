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

const DEFAULT_RELATIVE_PATH = "boilerplate-presets/circle";
const PRESETS_RELATIVE_PATH = "boilerplate-presets";
const FALLBACK_RELATIVE_PATHS = [
  "./boilerplate-presets/circle",
  "../boilerplate-presets/circle",
  "../../boilerplate-presets/circle",
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

const CONTROLS_DIST_RELATIVE_PATH = "controls-lib/dist/index.js";
const CONTROLS_BUNDLE_PATH = "/__hypertool__/controls/index.js";
const CONTROLS_GLOBALS_PATH = "/__hypertool__/controls/globals.js";
const FRAME_DIST_RELATIVE_PATH = "hyper-frame/dist/index.js";
const FRAME_BUNDLE_PATH = "/__hypertool__/frame/index.js";
const FRAME_GLOBALS_PATH = "/__hypertool__/frame/globals.js";

function injectControlsLibrary(files: FileMap): ScriptDescriptor | null {
  try {
    const distPath = resolve(process.cwd(), CONTROLS_DIST_RELATIVE_PATH);
    if (!existsSync(distPath)) {
      console.warn(`[boilerplate] Controls dist not found at ${distPath}`);
      return null;
    }

    const distCode = readFileSync(distPath, "utf8");
    files[CONTROLS_BUNDLE_PATH] = distCode;

    const globalsCode = `
import { createControls, createControlPanel, HypertoolControls, injectThemeVariables, studioTheme } from "./index.js";

if (typeof window !== "undefined") {
  window.hypertoolControls = {
    createControls,
    createControlPanel,
    HypertoolControls,
    injectThemeVariables,
    studioTheme,
  };
}
`.trimStart();

    files[CONTROLS_GLOBALS_PATH] = globalsCode;
    return { src: "./__hypertool__/controls/globals.js", module: true };
  } catch (error) {
    console.error("[boilerplate] Failed to inject controls library:", error);
    return null;
  }
}

function injectFrameLibrary(files: FileMap): ScriptDescriptor[] {
  const scripts: ScriptDescriptor[] = [];

  try {
    const distPath = resolve(process.cwd(), FRAME_DIST_RELATIVE_PATH);
    if (!existsSync(distPath)) {
      console.warn(`[boilerplate] Frame dist not found at ${distPath}`);
      return scripts;
    }

    const distCode = readFileSync(distPath, "utf8");
    files[FRAME_BUNDLE_PATH] = distCode;

    const globalsCode = `
import { mountP5Sketch, runP5Sketch, startP5Sketch } from "./index.js";

if (typeof window !== "undefined") {
  const existing = window.hyperFrame || {};
  const p5 = Object.assign({}, existing.p5 || {}, {
    mount: mountP5Sketch,
    run: runP5Sketch,
    start: startP5Sketch,
  });

  window.hyperFrame = Object.assign({}, existing, {
    mountP5Sketch,
    runP5Sketch,
    startP5Sketch,
    p5,
  });
}
`.trimStart();

    files[FRAME_GLOBALS_PATH] = globalsCode;
    scripts.push({ src: "./__hypertool__/frame/globals.js", module: true });
  } catch (error) {
    console.error("[boilerplate] Failed to inject frame library:", error);
  }

  return scripts;
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

  const frameScripts = injectFrameLibrary(files);
  if (frameScripts.length > 0) {
    scriptSources.push(...frameScripts);
  }

  const controlsScript = injectControlsLibrary(files);
  if (controlsScript) {
    scriptSources.push(controlsScript);
  }

  if (files["/index.html"] && scriptSources.length > 0) {
    files["/index.html"] = injectLibraryScripts(files["/index.html"], scriptSources);
  }

  return files;
}
