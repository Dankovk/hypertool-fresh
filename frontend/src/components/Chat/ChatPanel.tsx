import { IconHistory, IconRefresh, IconTemplate } from "@tabler/icons-react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "@/types/studio";
import { SettingsPanel } from "../Settings/SettingsPanel";
import { useStudioSettings } from "@/hooks/useStudioSettings";

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  streamingText?: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  onShowHistory: () => void;
  onShowPresets: () => void;
  hasVersionHistory: boolean;
}

export function ChatPanel({
  messages,
  input,
  loading,
  streamingText,
  onInputChange,
  onSubmit,
  onReset,
  onShowHistory,
  onShowPresets,
  hasVersionHistory,
}: ChatPanelProps) {
  const settings = useStudioSettings();
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
      <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-2">
        <div className="text-lg font-semibold tracking-tight text-accent">AI Studio</div>
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm text-text-secondary transition hover:bg-background/80"
            onClick={onShowPresets}
          >
            <IconTemplate size={18} /> Presets
          </button>
          {hasVersionHistory && (
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm text-text-secondary transition hover:bg-background/80"
              onClick={onShowHistory}
            >
              <IconHistory size={18} /> History
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm text-text-secondary transition hover:bg-background/80"
            onClick={onReset}
          >
            <IconRefresh size={18} /> Reset
          </button>
        </div>
      </div>
      <SettingsPanel
          model={settings.model}
          onModelChange={settings.setModel}
          editMode={settings.editMode}
          onEditModeChange={settings.setEditMode}
          apiKey={settings.apiKey}
          onApiKeyChange={settings.setApiKey}
          systemPrompt={settings.systemPrompt}
          onSystemPromptChange={settings.setSystemPrompt}
        />

      <ChatMessages messages={messages} loading={loading} streamingText={streamingText} />
      <ChatInput
        value={input}
        onChange={onInputChange}
        onSubmit={onSubmit}
        loading={loading}
      />
    </div>
  );
}
