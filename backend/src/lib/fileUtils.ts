import type { FileMap } from "../types/studio.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { HYPER_RUNTIME_DIST_FROM_BACKEND, BUNDLE_PATH, VIRTUAL_PATH } from "@hypertool/shared-config/paths";

export interface PresetData {
  id: string;
  name: string;
  description: string;
  files: FileMap;
}

export interface BoilerplateData {
  presets: PresetData[];
  universal: FileMap;
}

export interface RuntimeData {
  files: FileMap;
  timestamp: number;
}

/**
 * Normalize a file path by removing leading slashes
 * @param path - The file path to normalize
 * @param options - Options for normalization
 * @returns Normalized path
 */
export function normalizeFilePath(
  path: string,
  options?: { ensureLeadingSlash?: boolean }
): string {
  const clean = path.replace(/^\/+/, "");
  return options?.ensureLeadingSlash ? `/${clean}` : clean;
}

/**
 * Normalize all paths in a file map
 * @param files - The file map to normalize
 * @param options - Options for normalization
 * @returns Normalized file map
 */
export function normalizeFileMap(
  files: FileMap,
  options?: { ensureLeadingSlash?: boolean }
): FileMap {
  return Object.fromEntries(
    Object.entries(files).map(([path, content]) => [
      normalizeFilePath(path, options),
      content,
    ])
  );
}

/**
 * Convert files to client format (no leading slashes)
 * @param incoming - Incoming file map
 * @returns Normalized file map without leading slashes
 */
export function toClientFiles(incoming: FileMap): FileMap {
  const normalized: FileMap = {};
  Object.entries(incoming).forEach(([path, code]) => {
    const clean = path.replace(/^\/+/, "");
    if (clean) {
      normalized[clean] = code;
    }
  });
  return normalized;
}

/**
 * Add leading slashes to file paths (required by server/runtime APIs)
 * @param files - File map to convert
 * @returns File map with leading slashes
 */
export function toRuntimeFileMap(files: FileMap): Record<string, string> {
  return normalizeFileMap(files, { ensureLeadingSlash: true });
}

/**
 * Recursively read all files in a directory and create a FileMap
 * @param dir - Directory to read
 * @param base - Base directory for calculating relative paths
 * @param out - Output FileMap (for recursion)
 * @returns FileMap with all files from the directory
 */
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

/**
 * Get boilerplate file map by reading all preset directories
 * @returns BoilerplateData with all presets and their files
 */
export function getBoilerplateFileMap(): BoilerplateData {
  const projectRoot = resolve(process.cwd(), "..");
  const presetsPath = join(projectRoot, "boilerplate-presets");

  if (!existsSync(presetsPath)) {
    throw new Error(`Presets directory not found at: ${presetsPath}`);
  }

  const data: BoilerplateData = {
    presets: [],
    universal: {},
  };

  const entries = readdirSync(presetsPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === '__non-migrated__') {
      continue;
    }

    const presetPath = join(presetsPath, entry.name);
    const packageJsonPath = join(presetPath, "package.json");
    const indexHtmlPath = join(presetPath, "index.html");

    // Skip if no index.html
    if (!existsSync(indexHtmlPath)) {
      console.log(`⚠️  Skipping ${entry.name} (no index.html)`);
      continue;
    }

    let name = entry.name;
    let description = "";

    // Read package.json if exists
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        name = packageJson.name || entry.name;
        description = packageJson.description || "";
      } catch (e) {
        console.warn(`⚠️  Failed to parse package.json for ${entry.name}`);
      }
    }

    // Read all files in this preset
    const files = readDirectoryRecursive(presetPath);

    console.log(`✅ Loaded preset: ${entry.name} (${Object.keys(files).length} files)`);

    data.presets.push({
      id: entry.name,
      name,
      description,
      files,
    });

    // If this is the universal preset, store it separately
    if (entry.name === "universal") {
      data.universal = files;
    }
  }

  return data;
}

/**
 * Get runtime file map by reading the built runtime bundle
 * @returns RuntimeData with the runtime bundle files
 */
export function getRuntimeFileMap(): RuntimeData {
  const projectRoot = resolve(process.cwd(), "..");
  const runtimeDistPath = resolve(projectRoot, "backend", HYPER_RUNTIME_DIST_FROM_BACKEND);

  if (!existsSync(runtimeDistPath)) {
    throw new Error(`Runtime dist directory not found at: ${runtimeDistPath}`);
  }

  const bundlePath = join(runtimeDistPath, BUNDLE_PATH);
  if (!existsSync(bundlePath)) {
    throw new Error(`Runtime bundle not found at: ${bundlePath}`);
  }

  // Read the main bundle file
  const bundleCode = readFileSync(bundlePath, "utf8");

  const files: FileMap = {
    [VIRTUAL_PATH]: bundleCode,
  };

  console.log(`✅ Loaded runtime bundle: ${bundleCode.length} bytes`);

  return {
    files,
    timestamp: Date.now(),
  };
}

