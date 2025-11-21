/**
 * Centralized Zustand stores for optimized state management.
 *
 * Store architecture:
 * - settingsStore: App settings with localStorage persistence
 * - filesStore: Project files management with immer
 * - chatStore: Chat messages and AI interaction state
 * - versionsStore: Code version history
 * - uiStore: UI state (modals, etc.)
 * - boilerplateStore: Preset templates
 *
 * Optimization features:
 * - Persist middleware for localStorage sync
 * - Immer middleware for immutable updates
 * - Granular selectors to prevent unnecessary re-renders
 * - Separated concerns for better performance
 */

export { useSettingsStore, selectModel, selectApiKey, selectSystemPrompt, selectEditMode, selectAllSettings } from "./settingsStore";
export type { SettingsState, SettingsActions, SettingsStore } from "./settingsStore";

export { useFilesStore, selectFiles, selectFile, selectFileCount } from "./filesStore";
export type { FilesState, FilesActions, FilesStore } from "./filesStore";

export { useChatStore, selectMessages, selectInput, selectIsLoading, selectCanSend, selectMessageCount } from "./chatStore";
export type { ChatState, ChatActions, ChatStore } from "./chatStore";

export { useVersionsStore, selectVersions, selectVersionCount, selectHasVersions, selectLatestVersion } from "./versionsStore";
export type { VersionsState, VersionsActions, VersionsStore } from "./versionsStore";

export { useUIStore, selectShowVersionHistory, selectShowPresets, selectShowSettings, selectAnyModalOpen } from "./uiStore";
export type { UIState, UIActions, UIStore } from "./uiStore";

export { useBoilerplateStore, selectPresets, selectPresetById } from "./boilerplateStore";
export type { BoilerplateState, BoilerplateActions, BoilerplateStore } from "./boilerplateStore";

export { usePreviewStore } from "./previewStore";
