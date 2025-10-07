import { IconDownload } from "@tabler/icons-react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { config } from "@/config";

interface PreviewPanelProps {
  files: Record<string, string>;
  onDownload: () => void;
}

export function PreviewPanel({ files, onDownload }: PreviewPanelProps) {
  return (
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
          template={config.sandpack.template}
          theme={config.sandpack.theme}
          files={files}
          options={{
            recompileMode: "delayed",
            recompileDelay: config.sandpack.recompileDelay,
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
  );
}
