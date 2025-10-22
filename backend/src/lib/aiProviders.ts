import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export type ProviderType = "openai" | "anthropic" | "google";

interface ProviderConfig {
  name: ProviderType;
  envKeys: string[];
  modelPrefixes: string[];
  create: (apiKey: string) => any;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    name: "anthropic",
    envKeys: ["ANTHROPIC_API_KEY"],
    modelPrefixes: ["claude-"],
    create: (apiKey) => createAnthropic({ apiKey }),
  },
  {
    name: "google",
    envKeys: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    modelPrefixes: ["gemini-", "models/gemini"],
    create: (apiKey) => google(apiKey),
  },
  {
    name: "openai",
    envKeys: ["OPENAI_API_KEY"],
    modelPrefixes: ["gpt-", "o1", "o3"],
    create: (apiKey) => createOpenAI({ apiKey }),
  },
];

export function detectProviderForModel(model: string): ProviderConfig | null {
  return PROVIDER_CONFIGS.find(config =>
    config.modelPrefixes.some(prefix => model.startsWith(prefix))
  ) || null;
}

export function getProviderForModel(model: string, userApiKey?: string) {
  const config = detectProviderForModel(model);
  if (!config) {
    throw new Error(`Unsupported model: ${model}`);
  }

  // User-provided key takes precedence
  if (userApiKey?.trim()) {
    return config.create(userApiKey.trim());
  }

  // Fall back to environment variable
  const envKey = config.envKeys
    .map(key => process.env[key])
    .find(val => val?.trim());

  if (!envKey) {
    throw new Error(`${config.name.toUpperCase()}_API_KEY not configured`);
  }

  return config.create(envKey);
}
