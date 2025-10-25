import { applyPatchToFiles } from "llm-diff-patcher";
import {
  createTwoFilesPatch,
  applyPatch,
  parsePatch,
  structuredPatch,
} from "diff";
import { createHistoryEntry as saveHistoryEntryToDB } from "../services/historyService.js";

/**
 * Represents a code edit operation
 */
export interface CodeEdit {
  type: "search-replace" | "unified-diff";
  filePath: string;
  search?: string;
  replace?: string;
  diff?: string;
  context?: string;
}

/**
 * Result of applying a patch
 */
export interface PatchResult {
  success: boolean;
  filePath: string;
  newContent?: string;
  error?: string;
  hunksApplied?: number;
  hunksTotal?: number;
}

/**
 * History entry for undo/redo
 */
export interface EditHistoryEntry {
  id: string;
  timestamp: number;
  edits: CodeEdit[];
  beforeState: Record<string, string>;
  afterState: Record<string, string>;
  explanation?: string;
}

/**
 * Parse search/replace blocks from AI response
 * Format:
 * <<<<<<< SEARCH
 * old code
 * =======
 * new code
 * >>>>>>> REPLACE
 */
export function parseSearchReplaceBlocks(text: string): CodeEdit[] {
  const edits: CodeEdit[] = [];
  const regex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    edits.push({
      type: "search-replace",
      filePath: "", // Will be set by caller
      search: match[1],
      replace: match[2],
    });
  }

  return edits;
}

/**
 * Convert search/replace to unified diff format
 */
export function searchReplaceToUnifiedDiff(
  filePath: string,
  oldContent: string,
  search: string,
  replace: string
): string {
  // Find the search string in the content
  const searchIndex = oldContent.indexOf(search);
  if (searchIndex === -1) {
    throw new Error(`Search string not found in file: ${filePath}`);
  }

  // Create new content with replacement
  const newContent =
    oldContent.substring(0, searchIndex) +
    replace +
    oldContent.substring(searchIndex + search.length);

  // Generate unified diff
  return createTwoFilesPatch(
    filePath,
    filePath,
    oldContent,
    newContent,
    "before",
    "after"
  );
}

/**
 * Apply a single edit to file content using fuzzy matching
 */
export function applyEdit(
  filePath: string,
  content: string,
  edit: CodeEdit
): PatchResult {
  try {
    if (edit.type === "search-replace") {
      if (!edit.search || !edit.replace) {
        return {
          success: false,
          filePath,
          error: "Search or replace string missing",
        };
      }

      // Try exact match first
      const searchIndex = content.indexOf(edit.search);
      if (searchIndex !== -1) {
        const newContent =
          content.substring(0, searchIndex) +
          edit.replace +
          content.substring(searchIndex + edit.search.length);

        return {
          success: true,
          filePath,
          newContent,
          hunksApplied: 1,
          hunksTotal: 1,
        };
      }

      // If exact match fails, try fuzzy matching with normalized whitespace
      const normalizedSearch = edit.search.replace(/\s+/g, " ").trim();
      const normalizedContent = content.replace(/\s+/g, " ").trim();
      const fuzzyIndex = normalizedContent.indexOf(normalizedSearch);

      if (fuzzyIndex !== -1) {
        // Generate unified diff and apply it
        const diff = searchReplaceToUnifiedDiff(
          filePath,
          content,
          edit.search,
          edit.replace
        );

        const patches = parsePatch(diff);
        if (patches.length > 0) {
          const result = applyPatch(content, patches[0]);
          if (result !== false) {
            return {
              success: true,
              filePath,
              newContent: result,
              hunksApplied: 1,
              hunksTotal: 1,
            };
          }
        }
      }

      return {
        success: false,
        filePath,
        error: `Search string not found in file: ${filePath}`,
      };
    } else if (edit.type === "unified-diff") {
      if (!edit.diff) {
        return {
          success: false,
          filePath,
          error: "Diff string missing",
        };
      }

      // Apply unified diff patch
      const patches = parsePatch(edit.diff);
      if (patches.length === 0) {
        return {
          success: false,
          filePath,
          error: "Failed to parse diff",
        };
      }

      const result = applyPatch(content, patches[0]);
      if (result === false) {
        return {
          success: false,
          filePath,
          error: "Failed to apply patch",
        };
      }

      return {
        success: true,
        filePath,
        newContent: result,
        hunksApplied: patches[0].hunks.length,
        hunksTotal: patches[0].hunks.length,
      };
    }

    return {
      success: false,
      filePath,
      error: `Unknown edit type: ${edit.type}`,
    };
  } catch (error) {
    return {
      success: false,
      filePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Apply multiple edits to a file map
 */
export function applyEditsToFiles(
  files: Record<string, string>,
  edits: CodeEdit[]
): {
  success: boolean;
  files: Record<string, string>;
  results: PatchResult[];
  errors: string[];
} {
  const newFiles = { ...files };
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[patches] initial files:', Object.keys(newFiles));
  }
  const results: PatchResult[] = [];
  const errors: string[] = [];

  for (const edit of edits) {
    let filePath = edit.filePath;
    if (!filePath.startsWith("/")) {
      filePath = "/" + filePath;
    }

    let content = newFiles[filePath];

    if (content === undefined) {
      const altPath = filePath.startsWith("/") ? filePath.slice(1) : `/${filePath}`;
      content = newFiles[altPath];
      if (content !== undefined) {
        filePath = altPath;
      }
    }

    if (content === undefined) {
      const availableKeys = Object.keys(newFiles);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[patches] missing file', filePath, 'available keys:', availableKeys);
      }
      const available = availableKeys
        .map((key) => (key === filePath ? `${key}*` : key))
        .join(", ");
      errors.push(`File not found: ${filePath} (available: ${available})`);
      continue;
    }

    const result = applyEdit(filePath, content, edit);
    results.push(result);

    if (result.success && result.newContent) {
      newFiles[filePath] = result.newContent;
    } else {
      errors.push(`Failed to apply edit to ${filePath}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    files: newFiles,
    results,
    errors,
  };
}

/**
 * Create a history entry
 */
export function createHistoryEntry(
  edits: CodeEdit[],
  beforeState: Record<string, string>,
  afterState: Record<string, string>,
  explanation?: string,
  sessionId?: string
): EditHistoryEntry {
  const entry: EditHistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    edits,
    beforeState,
    afterState,
    explanation,
  };

  // Also save to MongoDB (async, don't wait for it)
  saveHistoryEntryToDB({
    sessionId,
    entryId: entry.id,
    timestamp: entry.timestamp,
    explanation: entry.explanation,
    edits: entry.edits,
    beforeState: entry.beforeState,
    afterState: entry.afterState,
  }).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to save history entry to database:', error);
    }
  });

  return entry;
}

/**
 * Generate a unified diff showing changes between two file states
 */
export function generateStateDiff(
  before: Record<string, string>,
  after: Record<string, string>
): string {
  const allFiles = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const diffs: string[] = [];

  for (const filePath of allFiles) {
    const beforeContent = before[filePath] || "";
    const afterContent = after[filePath] || "";

    if (beforeContent !== afterContent) {
      const diff = createTwoFilesPatch(
        filePath,
        filePath,
        beforeContent,
        afterContent,
        "before",
        "after"
      );
      diffs.push(diff);
    }
  }

  return diffs.join("\n\n");
}
