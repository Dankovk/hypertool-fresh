import { EditHistoryEntry } from "./patches.js";

/**
 * In-memory history manager with undo/redo support
 */
export class EditHistoryManager {
  private history: EditHistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Add a new entry to history
   */
  push(entry: EditHistoryEntry): void {
    // Remove any entries after current index (they're from a different timeline)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new entry
    this.history.push(entry);
    this.currentIndex = this.history.length - 1;

    // Enforce max size
    if (this.history.length > this.maxHistorySize) {
      const excess = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(excess);
      this.currentIndex -= excess;
    }
  }

  /**
   * Undo last edit
   */
  undo(): EditHistoryEntry | null {
    if (!this.canUndo()) {
      return null;
    }

    const entry = this.history[this.currentIndex];
    this.currentIndex--;
    return entry;
  }

  /**
   * Redo previously undone edit
   */
  redo(): EditHistoryEntry | null {
    if (!this.canRedo()) {
      return null;
    }

    this.currentIndex++;
    return this.history[this.currentIndex];
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state from history
   */
  getCurrentState(): Record<string, string> | null {
    if (this.currentIndex < 0) {
      return null;
    }
    return this.history[this.currentIndex].afterState;
  }

  /**
   * Get state after undo
   */
  getUndoState(): Record<string, string> | null {
    if (!this.canUndo()) {
      return null;
    }
    return this.history[this.currentIndex].beforeState;
  }

  /**
   * Get state after redo
   */
  getRedoState(): Record<string, string> | null {
    if (!this.canRedo()) {
      return null;
    }
    return this.history[this.currentIndex + 1].afterState;
  }

  /**
   * Get all history entries
   */
  getHistory(): EditHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get current history index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Get specific entry by ID
   */
  getEntryById(id: string): EditHistoryEntry | null {
    return this.history.find((entry) => entry.id === id) || null;
  }

  /**
   * Get recent entries (limited)
   */
  getRecentEntries(limit: number = 10): EditHistoryEntry[] {
    const start = Math.max(0, this.history.length - limit);
    return this.history.slice(start);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Get summary of history
   */
  getSummary(): {
    totalEntries: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
  } {
    return {
      totalEntries: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.currentIndex + 1,
      redoCount: this.history.length - this.currentIndex - 1,
    };
  }

  /**
   * Export history to JSON
   */
  toJSON(): string {
    return JSON.stringify({
      history: this.history,
      currentIndex: this.currentIndex,
    });
  }

  /**
   * Import history from JSON
   */
  static fromJSON(json: string): EditHistoryManager {
    const data = JSON.parse(json);
    const manager = new EditHistoryManager();
    manager.history = data.history || [];
    manager.currentIndex = data.currentIndex ?? -1;
    return manager;
  }
}

// Global history manager instance (can be moved to context/state management)
let globalHistoryManager: EditHistoryManager | null = null;

export function getHistoryManager(): EditHistoryManager {
  if (!globalHistoryManager) {
    globalHistoryManager = new EditHistoryManager();
  }
  return globalHistoryManager;
}

export function createNewHistoryManager(
  maxSize?: number
): EditHistoryManager {
  return new EditHistoryManager(maxSize);
}
