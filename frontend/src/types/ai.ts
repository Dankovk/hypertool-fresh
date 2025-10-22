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
  editMode: z.enum(["full", "patch"]).default("full").optional(), // "full" for backward compatibility
});

export type AiRequest = z.infer<typeof AiRequestSchema>;

// Schema for code edits (patches)
export const CodeEditSchema = z.object({
  type: z.enum(["search-replace", "unified-diff"]),
  filePath: z.string().min(1, "File path is required"),
  search: z.string().optional(),
  replace: z.string().optional(),
  diff: z.string().optional(),
  context: z.string().optional(),
}).refine(
  (data) => {
    // For search-replace, both search and replace must be present and non-empty
    if (data.type === "search-replace") {
      return !!data.search && data.search.length > 0 &&
             !!data.replace && data.replace.length > 0;
    }
    // For unified-diff, diff must be present and non-empty
    if (data.type === "unified-diff") {
      return !!data.diff && data.diff.length > 0;
    }
    return true;
  },
  {
    message: "Invalid edit: search-replace requires both 'search' and 'replace' fields, unified-diff requires 'diff' field",
  }
);

export type CodeEdit = z.infer<typeof CodeEditSchema>;

// Response schemas
export const AiFullResponseSchema = z.object({
  files: FileMapSchema,
  explanation: z.string().optional(),
});

export const AiPatchResponseSchema = z.object({
  edits: z.array(CodeEditSchema),
  explanation: z.string().optional(),
});

export type AiFullResponse = z.infer<typeof AiFullResponseSchema>;
export type AiPatchResponse = z.infer<typeof AiPatchResponseSchema>;

