import { MODEL_OPTIONS } from "@hypertool/shared-config/models";
import { 
  DEFAULT_SYSTEM_PROMPT_FULL, 
  DEFAULT_SYSTEM_PROMPT_PATCH,
  GEMINI_SYSTEM_PROMPT_FULL,
  GEMINI_SYSTEM_PROMPT_PATCH,
} from "../../../../packages/shared-config/prompts";

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

/**
 * Get the appropriate system prompt based on model and edit mode
 */
function getPromptForModelAndMode(model: string, editMode: "full" | "patch"): string {
  const isGemini = model.toLowerCase().includes('gemini');
  
  if (isGemini) {
    return editMode === "patch" ? GEMINI_SYSTEM_PROMPT_PATCH : GEMINI_SYSTEM_PROMPT_FULL;
  } else {
    return editMode === "patch" ? DEFAULT_SYSTEM_PROMPT_PATCH : DEFAULT_SYSTEM_PROMPT_FULL;
  }
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
    <div className="flex flex-col gap-4 border-b border-border bg-dark-base px-5 py-4">
      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Model</span>
          <select
            className="rounded-lg bg-dark-accent px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={model}
            onChange={(e) => {
              const newModel = e.target.value;
              onModelChange(newModel);
              // Update system prompt when model changes
              const newPrompt = getPromptForModelAndMode(newModel, editMode);
              onSystemPromptChange(newPrompt);
            }}
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
            className="rounded-lg bg-dark-accent px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={editMode}
            onChange={(e) => {
              const newMode = e.target.value as "full" | "patch";
              onEditModeChange(newMode);
              // Update system prompt when mode changes (considering current model)
              const newPrompt = getPromptForModelAndMode(model, newMode);
              onSystemPromptChange(newPrompt);
            }}
          >
            <option value="full">Full (Regenerate files)</option>
            <option value="patch">Patch (Smart edits) ⚡</option>
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
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">System Prompt</span>
        <textarea
          className="min-h-[120px] rounded-lg bg-dark-accent px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          rows={4}
          placeholder="Customize the assistant instructions"
        />
      </label>
    </div>
  );
}
