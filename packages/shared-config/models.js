

export const MODEL_OPTIONS = [
  // OpenAI
  // { value: "gpt-5", label: "GPT-5", provider: "OpenAI", tags: ["latest", "fast"] },
  // { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI", tags: ["fast", "creative"] },
  // { value: "o1", label: "O1", provider: "OpenAI", tags: ["reasoning"] },
  // { value: "o1-mini", label: "O1 Mini", provider: "OpenAI", tags: ["reasoning", "fast"] },
  // { value: "o3-mini", label: "O3 Mini", provider: "OpenAI", tags: ["reasoning", "latest"] },

  // Anthropic Claude (full model IDs for backend, aliases work in both)
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", provider: "Anthropic", tags: ["latest", "creative", "fast"] },
  // { value: "claude-opus-4-20250514", label: "Claude Opus 4", provider: "Anthropic", tags: ["creative", "best"] },
  // { value: "claude-3-7-sonnet-20250219", label: "Claude Sonnet 3.7", provider: "Anthropic", tags: ["fast"] },
  // { value: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5", provider: "Anthropic", tags: ["fast", "cost-effective"] },

  // Google Gemini
  // { value: "gemini-2.5-flash-exp", label: "Gemini 2.5 Flash Experimental", provider: "Google", tags: ["latest", "fast", "creative"] },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", tags: ["latest", "fast", "stable"] },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", tags: ["latest", "fast", "stable"] },
  { value: "gemini-3-pro-preview", label: "Gemini 3 Pro", provider: "Google", tags: ["latest", "fast", "stable"] },
  // { value: "gemini-2.5-flash-thinking-exp-01-21", label: "Gemini 2.5 Flash Thinking", provider: "Google", tags: ["latest", "reasoning", "experimental"] },
  // { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro", provider: "Google", tags: ["creative", "large-context"] },
  // { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash", provider: "Google", tags: ["fast", "cost-effective"] },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].value;
