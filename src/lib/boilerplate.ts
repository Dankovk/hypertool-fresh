import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type FileMap = Record<string, string>;

const DEFAULT_RELATIVE_PATH = "boilerplate";
const FALLBACK_RELATIVE_PATHS = [
  "./boilerplate",
  "../boilerplate",
  "../../boilerplate",
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

export function loadBoilerplateFiles(): FileMap {
  const boilerplatePath = resolveBoilerplatePath();
  return readDirectoryRecursive(boilerplatePath);
}


