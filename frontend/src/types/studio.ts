import { z } from "zod";

export const FileMapSchema = z.record(z.string());
export type FileMap = z.infer<typeof FileMapSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CodeVersionSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  files: FileMapSchema,
  prompt: z.string(),
  model: z.string(),
});
export type CodeVersion = z.infer<typeof CodeVersionSchema>;

export const PresetInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});
export type PresetInfo = z.infer<typeof PresetInfoSchema>;

export const StudioSettingsSchema = z.object({
  model: z.string(),
  apiKey: z.string(),
  systemPrompt: z.string(),
  editMode: z.enum(["full", "patch", "artifact"]).optional(),
});
export type StudioSettings = z.infer<typeof StudioSettingsSchema>;

// Streaming event types from AI responses
export interface StreamEvent {
  type: 'start' | 'token' | 'progress' | 'complete' | 'warning' | 'error';
  text?: string;
  files?: Record<string, string>;
  shellCommands?: string[];
  explanation?: string;
  mode?: 'patch' | 'full' | 'artifact';
  artifact?: {
    id: string;
    title: string;
  };
  error?: string;
  message?: string;
  details?: any;
  provider?: string;
}
