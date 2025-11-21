import { MODEL_OPTIONS } from "@hypertool/shared-config/models";

interface SettingsPanelProps {
  model: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
}

export function SettingsPanel({
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
}: SettingsPanelProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border bg-dark-base px-5 py-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Model</span>
          <select
            className="rounded-lg bg-dark-accent px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">API Key</span>
          <input
            className="rounded-lg bg-dark-accent px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            type="password"
            placeholder="Optional: overrides env key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>
    </div>
  );
}
