import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

type FileMap = Record<string, string>;

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
  let files: FileMap = {};

  if (presetId) {
    const presetsPath = resolvePresetsPath();
    if (presetsPath) {
      // Load shared files first (if they exist)
      const sharedPath = join(presetsPath, "shared");
      if (existsSync(sharedPath)) {
        files = readDirectoryRecursive(sharedPath);
      }

      // Load preset-specific files (overwrites shared if there are conflicts)
      const presetPath = join(presetsPath, presetId);
      if (existsSync(presetPath) && existsSync(join(presetPath, "index.html"))) {
        const presetFiles = readDirectoryRecursive(presetPath);
        files = { ...files, ...presetFiles };
        return files;
      }
    }
  }

  const boilerplatePath = resolveBoilerplatePath();
  return readDirectoryRecursive(boilerplatePath);
}

export function listAvailablePresets(): PresetInfo[] {
  const presetsPath = resolvePresetsPath();
  if (!presetsPath) {
    return [];
  }

  const presets: PresetInfo[] = [];
  const entries = readdirSync(presetsPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip the shared folder - it's not a preset
    if (entry.isDirectory() && entry.name !== "shared") {
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


