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

export default function HomePage() {
  const [files, setFiles] = useState<FileMap>({});
  const [baselineFiles, setBaselineFiles] = useState<FileMap>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const sandpackRef = useRef<any>(null);

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
    setFiles(parsed.data);
    setBaselineFiles(parsed.data);
  }, []);

  useEffect(() => {
    loadBoilerplate();
  }, [loadBoilerplate]);

  const previewFiles = useMemo(() => files, [files]);

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
          boilerplate: baselineFiles,
        }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const json = await res.json();
      const parsed = FileMapSchema.safeParse(json.files);
      if (!parsed.success) throw new Error("Invalid AI result");

      setFiles(parsed.data);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: json.explanation ?? "Updated project files.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (notificationsEnabled) toast.success("Project updated");
    } catch (err: any) {
      toast.error(err.message || "AI error");
    } finally {
      setLoading(false);
    }
  }, [input, messages, baselineFiles, notificationsEnabled]);

  const onReset = useCallback(async () => {
    await loadBoilerplate();
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
            <button className="btn-ghost" onClick={() => setNotificationsEnabled((v) => !v)} aria-label="Toggle notifications">
              <IconBell size={18} />
            </button>
            <button className="btn-ghost" onClick={onReset}>
              <IconRefresh size={18} /> Reset
            </button>
          </div>
        </div>
        <div className="messages">
          {messages.map((m) => (
            <div key={m.id} className={`message ${m.role === "assistant" ? "ai" : "user"}`}>
              <div className="subtle" style={{ marginBottom: 4 }}>{m.role}</div>
              <div>{m.content}</div>
            </div>
          ))}
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
            template="vanilla"
            theme="dark"
            options={{
              externalResources: [
                "https://unpkg.com/p5@1.9.2/lib/p5.min.js",
              ],
              recompileMode: "delayed",
              recompileDelay: 400,
              showNavigator: true,
              showTabs: true,
              showConsole: true,
              editorHeight: 520,
            }}
            customSetup={{ entry: "/index.html" }}
            files={previewFiles}
          />
        </div>
      </div>
    </div>
  );
}

