"use client";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/Chat/ChatPanel";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { PreviewPanel } from "@/components/Preview/PreviewPanel";
import { PresetsModal } from "@/components/Modals/PresetsModal";
import { VersionHistoryModal } from "@/components/Modals/VersionHistoryModal";
import { useBoilerplate } from "@/hooks/useBoilerplate";
import { useCodeVersions } from "@/hooks/useCodeVersions";
import { useAIChat } from "@/hooks/useAIChat";
import { useFilesStore, useUIStore, useVersionsStore, useChatStore } from "@/stores";
import { toRuntimeFileMap } from "@/lib/fileUtils";
import type { CodeVersion } from "@/types/studio";

export default function HomePage() {
  // Zustand stores
  const files = useFilesStore((state) => state.files);
  const setFiles = useFilesStore((state) => state.setFiles);
  const showVersionHistory = useUIStore((state) => state.showVersionHistory);
  const setShowVersionHistory = useUIStore((state) => state.setShowVersionHistory);
  const showPresets = useUIStore((state) => state.showPresets);
  const setShowPresets = useUIStore((state) => state.setShowPresets);

  // Custom hooks
  const { presets, loadBoilerplate } = useBoilerplate();
  const { codeVersions, clearVersions } = useCodeVersions();
  const chat = useAIChat();
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Load initial boilerplate (only once on mount)
  useEffect(() => {
    const loadInitial = async () => {
      const boilerplate = await loadBoilerplate();
      if (boilerplate) {
        setFiles(boilerplate);
      }
    };
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize files for runtime (leading slashes)
  // Memoize to prevent unnecessary re-renders of PreviewPanel
  const previewFiles = useMemo(() => toRuntimeFileMap(files), [files]);

  const onReset = useCallback(async () => {
    const boilerplate = await loadBoilerplate();
    if (boilerplate) {
      setFiles(boilerplate);
      clearMessages();
      clearVersions();
      toast.success("Reset to boilerplate");
    }
  }, [loadBoilerplate, setFiles, clearMessages, clearVersions]);

  const onLoadPreset = useCallback(async (presetId: string) => {
    const presetFiles = await loadBoilerplate(presetId);
    if (presetFiles) {
      setFiles(presetFiles);
      clearMessages();
      clearVersions();
      setShowPresets(false);
      toast.success("Preset loaded");
    }
  }, [loadBoilerplate, setFiles, clearMessages, clearVersions, setShowPresets]);

  const onRestoreVersion = useCallback((version: CodeVersion) => {
    setFiles(version.files);
    setShowVersionHistory(false);
    toast.success("Version restored");
  }, [setFiles, setShowVersionHistory]);

  const onDownload = useCallback(async () => {
    const res = await fetch("/api/download", {
      method: "POST",
      body: JSON.stringify({ files }),
    });
    if (!res.ok) {
      toast.error("Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  return (
    <div className="grid h-screen grid-cols-studio gap-4 p-4">
      <ChatPanel
        messages={chat.messages}
        input={chat.input}
        loading={chat.loading}
        onInputChange={chat.setInput}
        onSubmit={chat.sendMessage}
        onReset={onReset}
        onShowHistory={() => setShowVersionHistory(true)}
        onShowPresets={() => setShowPresets(true)}
        hasVersionHistory={codeVersions.length > 0}
      />

      <PreviewPanel files={previewFiles} onDownload={onDownload} />

      <PresetsModal
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
        presets={presets}
        onSelectPreset={onLoadPreset}
      />

      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        versions={codeVersions}
        onRestoreVersion={onRestoreVersion}
      />
    </div>
  );
}
