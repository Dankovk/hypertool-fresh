"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { z } from "zod";
import { toast } from "sonner";
import { IconBell, IconDownload, IconRefresh, IconRocket } from "@tabler/icons-react";

const FileMapSchema = z.record(z.string());

type FileMap = z.infer<typeof FileMapSchema>;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const MODEL_OPTIONS = [
  { value: "gpt-5", label: "GPT-5 (Latest)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "o1", label: "O1 (Reasoning)" },
  { value: "o1-mini", label: "O1 Mini (Reasoning)" }
];

const DEFAULT_SYSTEM_PROMPT =
  "You are an AI assistant that produces a complete file map for a p5.js sketch. Always return JSON in the shape { files: { \\\"path\\\": \\\"code\\\" }, explanation?: string } including every file.";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0].value);
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const settingsLoadedRef = useRef(false);
  const sandpackRef = useRef<any>(null);

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

  const loadBoilerplate = useCallback(async () => {
    const res = await fetch("/api/boilerplate");
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

  useEffect(() => {
    loadBoilerplate();
  }, [loadBoilerplate]);

  const sandpackFiles = useMemo(() => {
    const result: Record<string, string> = {};
    Object.entries(files).forEach(([path, code]) => {
      const withSlash = path.startsWith("/") ? path : `/${path}`;
      result[withSlash] = code;
    });
    return result;
  }, [files]);

  const onSubmit = useCallback(async () => {
    if (!input.trim()) return;
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
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const json = await res.json();
      const parsed = FileMapSchema.safeParse(json.files);
      if (!parsed.success) throw new Error("Invalid AI result");

      const normalized = toClientFiles(parsed.data);
      setFiles(normalized);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.explanation ?? "Updated project files.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (notificationsEnabled) toast.success("Project updated");
    } catch (err: any) {
      toast.error(err?.message || "AI error");
    } finally {
      setLoading(false);
    }
  }, [apiKey, input, messages, model, notificationsEnabled, systemPrompt, toClientFiles]);

  const onReset = useCallback(async () => {
    await loadBoilerplate();
    setMessages([]);
    toast.success("Reset to boilerplate");
  }, [loadBoilerplate]);

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
    <div className="grid-2">
      <div className="panel chat">
        <div className="header">
          <div className="title">AI Studio</div>
          <div className="toolbar">
            <button className="btn-ghost" onClick={onReset}>
              <IconRefresh size={18} /> Reset
            </button>
          </div>
        </div>

        <div className="settings">
          <div className="settings-grid">
            <label>
              <div className="field-label">Model</div>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div className="field-label">API Key</div>
              <input
                type="password"
                placeholder="Optional: overrides env key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
              <div className="field-helper subtle">Stored locally in your browser only.</div>
            </label>
          </div>
          <label className="textarea-field">
            <div className="field-label">System Prompt</div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="Customize the assistant instructions"
            />
          </label>
        </div>

        <div className="messages">
          {messages.map((m) => (
            <div key={m.id} className={`message ${m.role === "assistant" ? "ai" : "user"}`}>
              <div className="subtle" style={{ marginBottom: 4 }}>{m.role}</div>
              <div>{m.content}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="message ai">
              <div className="subtle" style={{ marginBottom: 4 }}>assistant</div>
              <div>Describe the visual you want and I&apos;ll update the sketch.</div>
            </div>
          )}
        </div>
        <div className="inputbar">
          <input
            className="grow"
            placeholder="Describe the visual you want (p5.js)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) onSubmit();
            }}
          />
          <button className="btn-primary" onClick={onSubmit} disabled={loading}>
            <IconRocket size={18} />
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="header">
          <div className="title">Live Preview</div>
          <div className="preview-toolbar">
            <button className="btn-ghost" onClick={onDownload}>
              <IconDownload size={18} /> Download
            </button>
          </div>
        </div>
        <div className="content" style={{ height: "calc(100vh - 100px)" }}>
          <Sandpack
            ref={sandpackRef}
            template="static"
            theme="dark"
            options={{
              externalResources: ["https://unpkg.com/p5@1.9.2/lib/p5.min.js"],
              recompileMode: "delayed",
              recompileDelay: 400,
              showNavigator: true,
              showTabs: true,
              showConsole: true,
              editorHeight: 520,
            }}
            customSetup={{ entry: "/index.html" }}
            files={sandpackFiles}
          />
        </div>
      </div>
    </div>
  );
}

