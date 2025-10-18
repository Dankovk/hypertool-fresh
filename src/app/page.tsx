"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/Chat/ChatPanel";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { PreviewPanel } from "@/components/Preview/PreviewPanel";
import { PresetsModal } from "@/components/Modals/PresetsModal";
import { VersionHistoryModal } from "@/components/Modals/VersionHistoryModal";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { useBoilerplate } from "@/hooks/useBoilerplate";
import { useCodeVersions } from "@/hooks/useCodeVersions";
import { useAIChat } from "@/hooks/useAIChat";
import { toSandpackFormat } from "@/lib/fileUtils";
import type { FileMap, CodeVersion } from "@/types/studio";

export default function HomePage() {
  const [files, setFiles] = useState<FileMap>({});
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Custom hooks
  const settings = useStudioSettings();
  const { presets, loadBoilerplate } = useBoilerplate();
  const { codeVersions, saveVersion, clearVersions } = useCodeVersions();

  const chat = useAIChat({
    model: settings.model,
    apiKey: settings.apiKey,
    systemPrompt: settings.systemPrompt,
    editMode: settings.editMode,
    files,
    onFilesUpdate: setFiles,
    onVersionSave: saveVersion,
  });

  // Load initial boilerplate
  useEffect(() => {
    const loadInitial = async () => {
      const boilerplate = await loadBoilerplate();
      if (boilerplate) {
        setFiles(boilerplate);
      }
    };
    loadInitial();
  }, [loadBoilerplate]);

  // Convert files to Sandpack format
  const sandpackFiles = toSandpackFormat(files);

  const onReset = useCallback(async () => {
    const boilerplate = await loadBoilerplate();
    if (boilerplate) {
      setFiles(boilerplate);
      chat.clearMessages();
      clearVersions();
      toast.success("Reset to boilerplate");
    }
  }, [loadBoilerplate, chat, clearVersions]);

  const onLoadPreset = useCallback(async (presetId: string) => {
    const presetFiles = await loadBoilerplate(presetId);
    if (presetFiles) {
      setFiles(presetFiles);
      chat.clearMessages();
      clearVersions();
      setShowPresets(false);
      toast.success("Preset loaded");
    }
  }, [loadBoilerplate, chat, clearVersions]);

  const onRestoreVersion = useCallback((version: CodeVersion) => {
    setFiles(version.files);
    setShowVersionHistory(false);
    toast.success("Version restored");
  }, []);

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
      {/* <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand"> */}
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
      {/* </div> */}

      <PreviewPanel files={sandpackFiles} onDownload={onDownload} />

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
