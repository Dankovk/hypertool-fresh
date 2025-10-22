import { MODEL_OPTIONS } from "@/config/models";
import { DEFAULT_SYSTEM_PROMPT_FULL, DEFAULT_SYSTEM_PROMPT_PATCH } from "@/config/prompts";

interface SettingsPanelProps {
  model: string;
  onModelChange: (model: string) => void;
  editMode: "full" | "patch";
  onEditModeChange: (mode: "full" | "patch") => void;
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (prompt: string) => void;
}

export function SettingsPanel({
  model,
  onModelChange,
  editMode,
  onEditModeChange,
  apiKey,
  onApiKeyChange,
  systemPrompt,
  onSystemPromptChange,
}: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border bg-dark-green px-5 py-4">
      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Model</span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
          >
            <optgroup label="OpenAI">
              {MODEL_OPTIONS.filter(m => m.provider === "OpenAI").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.tags.includes("latest") ? "⭐" : ""}
                </option>
              ))}
            </optgroup>
            <optgroup label="Anthropic Claude">
              {MODEL_OPTIONS.filter(m => m.provider === "Anthropic").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.tags.includes("latest") ? "⭐" : ""}
                </option>
              ))}
            </optgroup>
            <optgroup label="Google Gemini">
              {MODEL_OPTIONS.filter(m => m.provider === "Google").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.tags.includes("latest") ? "⭐" : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Edit Mode
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={editMode}
            onChange={(e) => {
              const mode = e.target.value as "full" | "patch";
              onEditModeChange(mode);
              // Update system prompt when mode changes
              onSystemPromptChange(mode === "patch" ? DEFAULT_SYSTEM_PROMPT_PATCH : DEFAULT_SYSTEM_PROMPT_FULL);
            }}
          >
            <option value="full">Full (Regenerate files)</option>
            <option value="patch">Patch (Smart edits) ⚡</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">API Key</span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            type="password"
            placeholder="Optional: overrides env key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">System Prompt</span>
        <textarea
          className="min-h-[120px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          rows={4}
          placeholder="Customize the assistant instructions"
        />
      </label>
    </div>
  );
}
