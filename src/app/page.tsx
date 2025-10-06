"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react";
import { z } from "zod";
import { toast } from "sonner";
import { IconDownload, IconRefresh, IconRocket, IconHistory, IconTemplate } from "@tabler/icons-react";

const FileMapSchema = z.record(z.string());

type FileMap = z.infer<typeof FileMapSchema>;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type CodeVersion = {
  id: string;
  timestamp: number;
  files: FileMap;
  prompt: string;
  model: string;
};

type PresetInfo = {
  id: string;
  name: string;
  description: string;
};

interface ModelOption {
  value: string;
  label: string;
  provider: string;
  tags: string[];
}

const MODEL_OPTIONS: ModelOption[] = [
  // OpenAI
  { value: "gpt-5", label: "GPT-5", provider: "OpenAI", tags: ["latest", "fast"] },
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI", tags: ["fast", "creative"] },
  { value: "o1", label: "O1", provider: "OpenAI", tags: ["reasoning"] },
  { value: "o1-mini", label: "O1 Mini", provider: "OpenAI", tags: ["reasoning", "fast"] },
  { value: "o3-mini", label: "O3 Mini", provider: "OpenAI", tags: ["reasoning", "latest"] },

  // Anthropic Claude
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5", provider: "Anthropic", tags: ["latest", "creative", "fast"] },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4", provider: "Anthropic", tags: ["creative", "best"] },
  { value: "claude-3-7-sonnet-20250219", label: "Claude Sonnet 3.7", provider: "Anthropic", tags: ["fast"] },
  { value: "claude-3-5-haiku-20241022", label: "Claude Haiku 3.5", provider: "Anthropic", tags: ["fast", "cost-effective"] },

  // Google Gemini
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash", provider: "Google", tags: ["latest", "fast", "creative"] },
  { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro", provider: "Google", tags: ["creative", "large-context"] },
  { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash", provider: "Google", tags: ["fast", "cost-effective"] },
];

const DEFAULT_SYSTEM_PROMPT =
  "You are an AI assistant that modifies p5.js canvas projects. You will receive the current project files and user instructions. Make the requested changes while preserving any existing code that should remain. Always respond with a complete file map including ALL files (modified and unmodified): { files: { \\\"path\\\": \\\"code\\\" }, explanation?: string }.";

const SETTINGS_STORAGE_KEY = "studio-settings";

type StudioSettings = {
  model: string;
  apiKey: string;
  systemPrompt: string;
};

export default function HomePage() {
  const [files, setFiles] = useState<FileMap>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0].value);
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([]);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const settingsLoadedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toClientFiles = useCallback((incoming: FileMap) => {
    const normalized: FileMap = {};
    Object.entries(incoming).forEach(([path, code]) => {
      const clean = path.replace(/^\/+/, "");
      if (clean) {
        normalized[clean] = code;
      }
    });
    return normalized;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StudioSettings>;
        if (parsed.model && MODEL_OPTIONS.some((option) => option.value === parsed.model)) {
          setModel(parsed.model);
        }
        if (typeof parsed.apiKey === "string") {
          setApiKey(parsed.apiKey);
        }
        if (typeof parsed.systemPrompt === "string" && parsed.systemPrompt.trim().length > 0) {
          setSystemPrompt(parsed.systemPrompt);
        }
      }
    } catch (error) {
      console.warn("Failed to load stored settings", error);
    } finally {
      settingsLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!settingsLoadedRef.current || typeof window === "undefined") return;
    const payload: StudioSettings = {
      model,
      apiKey,
      systemPrompt,
    };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist settings", error);
    }
  }, [model, apiKey, systemPrompt]);

  const loadBoilerplate = useCallback(async (presetId?: string) => {
    const url = presetId ? `/api/boilerplate?preset=${presetId}` : "/api/boilerplate";
    const res = await fetch(url);
    if (!res.ok) {
      toast.error("Failed to load boilerplate");
      return;
    }
    const json = await res.json();
    const parsed = FileMapSchema.safeParse(json.files);
    if (!parsed.success) {
      toast.error("Invalid boilerplate format");
      return;
    }
    const normalized = toClientFiles(parsed.data);
    setFiles(normalized);
  }, [toClientFiles]);

  const loadPresets = useCallback(async () => {
    const res = await fetch("/api/boilerplate?action=list");
    if (!res.ok) return;
    const json = await res.json();
    if (json.presets) {
      setPresets(json.presets);
    }
  }, []);

  useEffect(() => {
    loadBoilerplate();
    loadPresets();
  }, [loadBoilerplate, loadPresets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sandpackFiles = useMemo(() => {
    const result: Record<string, string> = {};
    Object.entries(files).forEach(([path, code]) => {
      const withSlash = path.startsWith("/") ? path : `/${path}`;
      result[withSlash] = code;
    });
    return result;
  }, [files]);

  const onSubmit = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: input };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          model,
          apiKey: apiKey.trim() || undefined,
          systemPrompt: systemPrompt.trim() || undefined,
          currentFiles: sandpackFiles,
        }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const json = await res.json();
      const parsed = FileMapSchema.safeParse(json.files);
      if (!parsed.success) throw new Error("Invalid AI result");

      const normalized = toClientFiles(parsed.data);

      // Save current version before updating
      const version: CodeVersion = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        files: normalized,
        prompt: input,
        model,
      };
      setCodeVersions(prev => [version, ...prev].slice(0, 10)); // Keep last 10 versions

      setFiles(normalized);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.explanation ?? "Updated project files.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      toast.success("Project updated");
    } catch (err: any) {
      toast.error(err?.message || "AI error");
    } finally {
      setLoading(false);
    }
  }, [apiKey, input, loading, messages, model, sandpackFiles, systemPrompt, toClientFiles]);

  const onReset = useCallback(async () => {
    await loadBoilerplate();
    setMessages([]);
    setCodeVersions([]);
    toast.success("Reset to boilerplate");
  }, [loadBoilerplate]);

  const onLoadPreset = useCallback(async (presetId: string) => {
    await loadBoilerplate(presetId);
    setMessages([]);
    setCodeVersions([]);
    setShowPresets(false);
    toast.success("Preset loaded");
  }, [loadBoilerplate]);

  const onRestoreVersion = useCallback((version: CodeVersion) => {
    setFiles(version.files);
    setShowVersionHistory(false);
    toast.success("Version restored");
  }, []);

  const onDownload = useCallback(async () => {
    const res = await fetch("/api/download", { method: "POST", body: JSON.stringify({ files }) });
    if (!res.ok) {
      toast.error("Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  return (
    <div className="grid h-screen grid-cols-studio gap-4 p-4">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
        <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
          <div className="text-lg font-semibold tracking-tight text-accent">AI Studio</div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-muted"
              onClick={() => setShowPresets(!showPresets)}
            >
              <IconTemplate size={18} /> Presets
            </button>
            {codeVersions.length > 0 && (
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-muted"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                <IconHistory size={18} /> History
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-muted"
              onClick={onReset}
            >
              <IconRefresh size={18} /> Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b border-border bg-black/20 px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">Model</span>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={model}
                onChange={(e) => setModel(e.target.value)}
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
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                type="password"
                placeholder="Optional: overrides env key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <span className="text-xs text-text-secondary">Stored locally in your browser only.</span>
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">System Prompt</span>
            <textarea
              className="min-h-[120px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="Customize the assistant instructions"
            />
          </label>
        </div>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-brand-sm animate-slide-in ${
                m.role === "assistant"
                  ? "border-[#1e3a4d] bg-gradient-to-br from-[#0f1922] to-[#162028]"
                  : "ml-auto border-[#333] bg-gradient-to-br from-[#1a1a1a] to-[#242424]"
              }`}
            >
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                {m.role}
              </div>
              <div className="leading-relaxed text-text">{m.content}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="max-w-[85%] rounded-2xl border border-[#1e3a4d] bg-gradient-to-br from-[#0f1922] to-[#162028] px-4 py-3 text-sm shadow-brand-sm">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                assistant
              </div>
              <div className="leading-relaxed text-text">Describe the visual you want and I&apos;ll update the sketch.</div>
            </div>
          )}
          {loading && (
            <div className="max-w-[85%] rounded-2xl border border-[#1e3a4d] bg-gradient-to-br from-[#0f1922] to-[#162028] px-4 py-3 text-sm shadow-brand-sm">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent animate-typing-1" />
                  <span className="inline-block h-2 w-2 rounded-full bg-accent animate-typing-2" />
                  <span className="inline-block h-2 w-2 rounded-full bg-accent animate-typing-3" />
                </span>
                <span className="text-sm text-text-secondary">Generating...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex items-center gap-3 border-t border-border bg-black/20 px-5 py-4">
          <input
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="Describe the visual you want (p5.js)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) onSubmit();
            }}
          />
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-background shadow-lg transition hover:shadow-xl disabled:opacity-50"
            onClick={onSubmit}
            disabled={loading}
          >
            <IconRocket size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
        <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
          <div className="text-lg font-semibold tracking-tight text-accent">Live Preview</div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-muted"
              onClick={onDownload}
            >
              <IconDownload size={18} /> Download
            </button>
          </div>
        </div>
        <div className="flex-1">
          <SandpackProvider
            template="static"
            theme="dark"
            files={sandpackFiles}
            options={{
              recompileMode: "delayed",
              recompileDelay: 500,
              
            }}
            customSetup={{
              entry: "/index.html",
              environment: "static",
            }}
          >
            <SandpackLayout className="sandpack-layout h-full w-full">
              <div className="sandpack-preview h-full w-full">
                <SandpackPreview showNavigator showOpenInCodeSandbox={false} />
              </div>
              
            </SandpackLayout>
          </SandpackProvider>
        </div>
      </div>

      {showPresets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPresets(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-brand" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
              <div className="text-lg font-semibold tracking-tight text-accent">Choose a Preset</div>
              <button className="text-text-secondary hover:text-text" onClick={() => setShowPresets(false)}>✕</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="grid gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    className="flex flex-col items-start gap-1 rounded-lg border border-border bg-background p-4 text-left transition hover:border-accent hover:bg-muted"
                    onClick={() => onLoadPreset(preset.id)}
                  >
                    <div className="font-semibold text-text">{preset.name}</div>
                    <div className="text-sm text-text-secondary">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showVersionHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowVersionHistory(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-brand" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
              <div className="text-lg font-semibold tracking-tight text-accent">Version History</div>
              <button className="text-text-secondary hover:text-text" onClick={() => setShowVersionHistory(false)}>✕</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="grid gap-3">
                {codeVersions.map((version) => (
                  <button
                    key={version.id}
                    className="flex flex-col items-start gap-1 rounded-lg border border-border bg-background p-4 text-left transition hover:border-accent hover:bg-muted"
                    onClick={() => onRestoreVersion(version)}
                  >
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span>{new Date(version.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="font-mono">{MODEL_OPTIONS.find(m => m.value === version.model)?.label || version.model}</span>
                    </div>
                    <div className="text-sm text-text">{version.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

