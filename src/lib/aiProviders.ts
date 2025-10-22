import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createLogger } from "@/lib/logger";

const logger = createLogger('aiProviders');

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
  logger.debug('Detecting provider for model', { model });

  const config = PROVIDER_CONFIGS.find(config =>
    config.modelPrefixes.some(prefix => model.startsWith(prefix))
  ) || null;

  if (config) {
    logger.debug('Provider detected', {
      model,
      provider: config.name,
      matchedPrefixes: config.modelPrefixes.filter(prefix => model.startsWith(prefix)),
    });
  } else {
    logger.warn('No provider detected for model', { model });
  }

  return config;
}

export function getProviderForModel(model: string, userApiKey?: string) {
  logger.info('Getting provider for model', {
    model,
    hasUserApiKey: !!userApiKey,
  });

  const config = detectProviderForModel(model);
  if (!config) {
    logger.error('Unsupported model requested', undefined, { model });
    throw new Error(`Unsupported model: ${model}`);
  }

  // User-provided key takes precedence
  if (userApiKey?.trim()) {
    logger.info('Using user-provided API key', {
      model,
      provider: config.name,
    });
    return config.create(userApiKey.trim());
  }

  // Fall back to environment variable
  logger.debug('Checking environment variables for API key', {
    provider: config.name,
    checkedKeys: config.envKeys,
  });

  const envKey = config.envKeys
    .map(key => process.env[key])
    .find(val => val?.trim());

  if (!envKey) {
    logger.error('API key not configured', undefined, {
      provider: config.name,
      checkedKeys: config.envKeys,
    });
    throw new Error(`${config.name.toUpperCase()}_API_KEY not configured`);
  }

  logger.info('Using environment API key', {
    model,
    provider: config.name,
  });

  return config.create(envKey);
}
