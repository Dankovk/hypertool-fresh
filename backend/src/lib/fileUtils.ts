import type { FileMap } from "../types/studio.js";

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
