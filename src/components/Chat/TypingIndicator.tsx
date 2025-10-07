export function TypingIndicator() {
  return (
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
  );
}
