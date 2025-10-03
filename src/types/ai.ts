import { z } from "zod";

export const FileMapSchema = z.record(z.string());

export type FileMap = z.infer<typeof FileMapSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AiRequestSchema = z.object({
  messages: z.array(ChatMessageSchema.pick({ role: true, content: true })),
  model: z.string(),
  apiKey: z.string().optional(),
  systemPrompt: z.string().optional(),
  currentFiles: FileMapSchema.optional(),
});

export type AiRequest = z.infer<typeof AiRequestSchema>;

