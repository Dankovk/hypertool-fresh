"use client";

import { useEffect, useRef } from "react";
import { useFilesStore } from "@/stores";
import { useMutation } from "convex/react";
import { getSessionId } from "@/lib/session";
import type { FileMap } from "@/types/studio";

/**
 * Check if a path is a hypertool runtime file
 * Handles variations: __hypertool__, _hypertool_, with/without leading slash
 * Matches paths like:
 * - /__hypertool__/index.js
 * - __hypertool__/index.js  
 * - /_hypertool_/index.js
 * - _hypertool_/index.js
 */
function isHypertoolRuntimeFile(path: string): boolean {
  // Normalize path (remove leading slash for comparison)
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  
  // Check if path contains 'hypertool' (case insensitive for safety)
  if (!normalized.toLowerCase().includes('hypertool')) {
    return false;
  }
  
  // Extract the directory part before first /
  const firstSlash = normalized.indexOf('/');
  const dir = firstSlash >= 0 ? normalized.slice(0, firstSlash) : normalized;
  
  // Remove all underscores - if result is just 'hypertool', it's a match
  // This matches: __hypertool__, _hypertool_, hypertool, etc.
  const dirWithoutUnderscores = dir.replace(/_/g, '').toLowerCase();
  return dirWithoutUnderscores === 'hypertool';
}

function filterFilesForSaving(files: FileMap): FileMap {
  const filtered: FileMap = {};
  
  for (const [path, content] of Object.entries(files)) {
    // Skip runtime files (auto-injected)
    if (isHypertoolRuntimeFile(path)) {
      continue;
    }
    
    // Skip source maps (generated files)
    if (path.endsWith(".map")) {
      continue;
    }
    
    // Skip other generated/system files that might be large
    if (path.startsWith("/.next/") || path.startsWith("/node_modules/")) {
      continue;
    }
    
    filtered[path] = content;
  }
  
  return filtered;
}

/**
 * Calculate the approximate size of a FileMap in bytes when serialized as JSON
 */
function estimateJsonSize(files: FileMap): number {
  try {
    const jsonString = JSON.stringify(files);
    // Convert string to bytes (UTF-8 encoding)
    return new Blob([jsonString]).size;
  } catch {
    // Fallback: rough estimate
    return JSON.stringify(Object.keys(files)).length * 10;
  }
}

/**
 * Hook to auto-save current file state to session when files change.
 * This allows restoring the exact code state on page refresh.
 * 
 * Filters out runtime/system files to stay under Convex's 1 MiB limit.
 */
export function useAutoSaveSessionFiles() {
  const files = useFilesStore((state) => state.files);
  const sessionId = getSessionId();
  // @ts-expect-error - Convex type generation may be temporarily out of sync
  const saveFilesMutation = useMutation("sessions:saveCurrentFiles");
  
  // Debounce saving to avoid too many mutations
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedHashRef = useRef<string | null>(null);
  // Track if we're in initial load/restoration phase (prevent auto-save from triggering during restore)
  const isInitialLoadRef = useRef(true);
  const initialLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't save if files are empty (initial load)
    const fileCount = Object.keys(files).length;
    if (fileCount === 0) {
      return;
    }

    // Skip auto-save during initial load/restoration
    // After files are first loaded, set a flag and give it some time before enabling auto-save
    // This prevents saved files from being overwritten during restoration
    if (isInitialLoadRef.current) {
      // On first file load, set the hash to match current files and disable initial load after a delay
      const filteredFiles = filterFilesForSaving(files);
      const filesHash = JSON.stringify(Object.keys(filteredFiles).sort()) + 
                        JSON.stringify(Object.values(filteredFiles).map(v => v.substring(0, 500)));
      
      // Set last saved hash to current state so we don't think restored files are a "change"
      lastSavedHashRef.current = filesHash;
      
      // Clear any existing initial load timeout
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
      }
      
      // Disable initial load flag after a short delay to allow restoration to complete
      initialLoadTimeoutRef.current = setTimeout(() => {
        isInitialLoadRef.current = false;
        initialLoadTimeoutRef.current = null;
        console.log("[auto-save] ✅ Initial load complete, auto-save enabled");
      }, 2000); // 2 seconds should be enough for restoration to complete
      
      console.log("[auto-save] ⏳ Initial load detected, skipping save (restoration phase)");
      return;
    }

    // Filter out runtime/system files that don't need to be saved
    const filteredFiles = filterFilesForSaving(files);
    
    // Don't save if all files were filtered out (would be an empty object)
    const filteredFileCount = Object.keys(filteredFiles).length;
    if (filteredFileCount === 0) {
      console.log("[auto-save] All files filtered out, skipping save (only runtime/system files present)");
      return;
    }
    
    // Debug: Log which files were filtered out
    const originalKeys = Object.keys(files);
    const filteredKeys = Object.keys(filteredFiles);
    const filteredOut = originalKeys.filter(key => !filteredKeys.includes(key));
    if (filteredOut.length > 0) {
      console.log(`[auto-save] Filtered out ${filteredOut.length} system files, keeping ${filteredFileCount} user files`);
      console.log("[auto-save] Filtered out:", filteredOut);
      console.log("[auto-save] Keeping:", filteredKeys.slice(0, 10));
    }
    
    // Check size before saving (Convex limit is 1 MiB)
    const estimatedSize = estimateJsonSize(filteredFiles);
    const maxSize = 1024 * 1024; // 1 MiB
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const estimatedSizeMB = (estimatedSize / (1024 * 1024)).toFixed(2);
    
    if (estimatedSize > maxSize) {
      console.warn(
        `[auto-save] ⚠️ File state too large (${estimatedSizeMB} MiB > ${maxSizeMB} MiB). ` +
        `Skipping save to avoid Convex limit. Consider reducing file size or excluding more files.`
      );
      return;
    }

    // Create a simple hash to detect actual content changes
    // Only save if content actually changed (not just reference)
    const filesHash = JSON.stringify(Object.keys(filteredFiles).sort()) + 
                      JSON.stringify(Object.values(filteredFiles).map(v => v.substring(0, 500)));

    if (lastSavedHashRef.current === filesHash) {
      // Content hasn't changed, skip saving
      return;
    }

    // Only log if we're not in initial load (to reduce console noise during restoration)
    if (!isInitialLoadRef.current) {
      console.log("[auto-save] File content changed, will save after debounce");
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce: save 1 second after last change
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveFilesMutation({
          sessionId,
          files: filteredFiles,
        });
        lastSavedHashRef.current = filesHash;
        console.log(`[auto-save] ✅ Saved file state to session (${estimatedSizeMB} MiB, ${Object.keys(filteredFiles).length} files)`);
      } catch (error: any) {
        // Check if it's a size error specifically
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes("too large") || errorMessage.includes("maximum size")) {
          console.warn(
            `[auto-save] ⚠️ File state still too large after filtering (${estimatedSizeMB} MiB). ` +
            `Convex limit exceeded. Some files may not be restored on refresh.`
          );
        } else {
          console.error("[auto-save] Failed to save file state:", error);
        }
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
    };
  }, [files, sessionId, saveFilesMutation]);
}

