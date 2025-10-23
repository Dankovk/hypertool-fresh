export interface ModelOption {
  value: string;
  label: string;
  provider: string;
  tags: string[];
}

export const MODEL_OPTIONS: ModelOption[] = [
  // OpenAI
  // { value: "gpt-5", label: "GPT-5", provider: "OpenAI", tags: ["latest", "fast"] },
  // { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI", tags: ["fast", "creative"] },
  // { value: "o1", label: "O1", provider: "OpenAI", tags: ["reasoning"] },
  // { value: "o1-mini", label: "O1 Mini", provider: "OpenAI", tags: ["reasoning", "fast"] },
  // { value: "o3-mini", label: "O3 Mini", provider: "OpenAI", tags: ["reasoning", "latest"] },

  // Anthropic Claude
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "Anthropic", tags: ["latest", "creative", "fast"] },
  { value: "claude-opus-4-1", label: "Claude Opus 4", provider: "Anthropic", tags: ["creative", "best"] },
  { value: "claude-3-7", label: "Claude Sonnet 3.7", provider: "Anthropic", tags: ["fast"] },
  { value: "claude-3-5", label: "Claude Haiku 3.5", provider: "Anthropic", tags: ["fast", "cost-effective"] },

  // Google Gemini (only 2.0 models are currently available with this API key)
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash Experimental", provider: "Google", tags: ["latest", "fast", "creative"] },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google", tags: ["latest", "fast", "stable"] },
  { value: "gemini-2.0-flash-thinking-exp-01-21", label: "Gemini 2.0 Flash Thinking", provider: "Google", tags: ["latest", "reasoning", "experimental"] },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].value;
