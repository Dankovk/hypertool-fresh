import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type FileMap = Record<string, string>;

const BOILERPLATE_RELATIVE_PATHS = [
  "../boilerplate",
  "../../boilerplate",
  "../../../boilerplate",
  "../apps/boilerplate",
  "../../apps/boilerplate",
  "../../../apps/boilerplate",
  "apps/boilerplate",
];

export function resolveBoilerplatePath(): string {
  const cwd = process.cwd();
  for (const relativePath of BOILERPLATE_RELATIVE_PATHS) {
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


