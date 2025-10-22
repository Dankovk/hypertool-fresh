"use client";

import { useState, useMemo, useEffect } from "react";
import { IconChevronDown, IconChevronUp, IconFile, IconCopy, IconCheck, IconSearch, IconReplace } from "@tabler/icons-react";
import { codeToHtml } from "shiki";
import { parse as parsePartialJSON } from "partial-json";

interface StreamingPreviewProps {
  streamingText: string;
  isStreaming?: boolean;
}

interface FileBlock {
  type: "file";
  filePath: string;
  language: string;
  code: string;
}

interface SearchReplaceBlock {
  type: "search-replace";
  filePath?: string;
  language: string;
  searchCode: string;
  replaceCode: string;
}

interface TextBlock {
  type: "text";
  content: string;
}

type ContentBlock = FileBlock | SearchReplaceBlock | TextBlock;

// Cache for parsing results to avoid re-parsing same content
const parseCache = new Map<string, any[]>();
const MAX_CACHE_SIZE = 50;

function extractEditsFromPartialJSON(jsonContent: string): any[] {
  // Check cache first
  const cacheKey = jsonContent.slice(0, 100) + jsonContent.length; // Use start + length as key
  if (parseCache.has(cacheKey)) {
    return parseCache.get(cacheKey)!;
  }

  const edits: any[] = [];

  try {
    // Use partial-json to parse incomplete JSON
    const parsed = parsePartialJSON(jsonContent);

    if (parsed && parsed.edits && Array.isArray(parsed.edits)) {
      // Filter out incomplete edits (those without required fields)
      const validEdits = parsed.edits.filter((edit: any) => {
        if (edit.type === "search-replace") {
          return edit.filePath && edit.search !== undefined && edit.replace !== undefined;
        } else if (edit.type === "create") {
          return edit.filePath && edit.code !== undefined;
        }
        return false;
      });

      // Cache the result
      if (parseCache.size >= MAX_CACHE_SIZE) {
        // Clear oldest entries
        const firstKey = parseCache.keys().next().value;
        parseCache.delete(firstKey);
      }
      parseCache.set(cacheKey, validEdits);

      return validEdits;
    }
  } catch (e) {
    // If parsing completely fails, cache empty array to avoid re-trying
    parseCache.set(cacheKey, []);
  }

  return edits;
}

function parseStreamingContent(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Try to parse as JSON first (for AI edit responses)
  // Match both complete and incomplete JSON code blocks
  const jsonCodeBlockMatch = text.match(/```json\s*\n([\s\S]*?)(?:```|$)/);
  if (jsonCodeBlockMatch) {
    const jsonContent = jsonCodeBlockMatch[1];

    // Try to extract individual complete edit objects even from incomplete JSON
    const edits = extractEditsFromPartialJSON(jsonContent);

    if (edits.length > 0) {
      // Process each complete edit
      edits.forEach((edit: any) => {
        if (edit.type === "search-replace" && edit.filePath && edit.search !== undefined && edit.replace !== undefined) {
          const language = detectLanguage(edit.filePath);
          blocks.push({
            type: "search-replace",
            filePath: edit.filePath,
            language,
            searchCode: edit.search,
            replaceCode: edit.replace,
          });
        } else if (edit.type === "create" && edit.filePath && edit.code !== undefined) {
          const language = detectLanguage(edit.filePath);
          blocks.push({
            type: "file",
            filePath: edit.filePath,
            language,
            code: edit.code,
          });
        }
      });

      return blocks;
    }

    // If we couldn't parse any edits yet, don't show anything (hides raw JSON during initial streaming)
    // Return empty blocks so the component shows "Streaming..."
    return [];
  }

  // Pattern for file blocks: File path followed by code block
  const fileBlockRegex = /(?:^|\n)(?:File:|Path:)?\s*([\w\-./]+\.(ts|tsx|js|jsx|css|json|html|py|java|go|rs|rb|php|swift|kt|dart|vue|scss|sass|less|yaml|yml|xml|md|sh|bash|sql))\s*\n```(\w+)?\n([\s\S]*?)(?:```|$)/g;

  // Pattern for search/replace blocks
  const searchReplaceRegex = /(?:^|\n)(?:File:|Path:)?\s*([\w\-./]+\.(ts|tsx|js|jsx|css|json|html|py|java|go|rs|rb|php|swift|kt|dart|vue|scss|sass|less|yaml|yml|xml|md|sh|bash|sql))?\s*\n(?:Search|SEARCH|search):\s*\n```(\w+)?\n([\s\S]*?)```\s*\n(?:Replace|REPLACE|replace):\s*\n```(\w+)?\n([\s\S]*?)(?:```|$)/g;

  // Pattern for standalone code blocks (no file path)
  const standaloneCodeBlockRegex = /```(\w+)?\n([\s\S]*?)(?:```|$)/g;

  let lastIndex = 0;
  const matches: Array<{ index: number; length: number; block: ContentBlock }> = [];

  // Find all search/replace blocks first
  let match;
  while ((match = searchReplaceRegex.exec(text)) !== null) {
    const filePath = match[1];
    const searchLang = match[3] || detectLanguage(filePath || "");
    const searchCode = match[4];
    const replaceLang = match[5] || searchLang;
    const replaceCode = match[6];

    matches.push({
      index: match.index,
      length: match[0].length,
      block: {
        type: "search-replace",
        filePath,
        language: searchLang,
        searchCode,
        replaceCode,
      }
    });
  }

  // Find all file blocks (with file paths)
  while ((match = fileBlockRegex.exec(text)) !== null) {
    // Check if this match overlaps with a search/replace block
    const overlaps = matches.some(m =>
      match.index >= m.index && match.index < m.index + m.length
    );

    if (!overlaps) {
      const filePath = match[1];
      const language = match[3] || detectLanguage(filePath);
      const code = match[4];

      matches.push({
        index: match.index,
        length: match[0].length,
        block: {
          type: "file",
          filePath,
          language,
          code,
        }
      });
    }
  }

  // Find all standalone code blocks (without file paths)
  while ((match = standaloneCodeBlockRegex.exec(text)) !== null) {
    // Check if this match overlaps with existing matches
    const overlaps = matches.some(m =>
      match.index >= m.index && match.index < m.index + m.length
    );

    if (!overlaps) {
      const language = match[1] || "plaintext";
      const code = match[2];

      // Try to find a file path in the text before this code block
      const textBefore = text.slice(Math.max(0, match.index - 200), match.index);
      const filePathMatch = textBefore.match(/(?:File:|Path:)?\s*([\w\-./]+\.(ts|tsx|js|jsx|css|json|html|py|java|go|rs|rb|php|swift|kt|dart|vue|scss|sass|less|yaml|yml|xml|md|sh|bash|sql))\s*$/);

      if (filePathMatch) {
        // Found a file path, create a file block
        matches.push({
          index: match.index,
          length: match[0].length,
          block: {
            type: "file",
            filePath: filePathMatch[1],
            language: match[1] || detectLanguage(filePathMatch[1]),
            code,
          }
        });
      } else {
        // No file path, create a generic file block
        matches.push({
          index: match.index,
          length: match[0].length,
          block: {
            type: "file",
            filePath: `code.${language}`,
            language,
            code,
          }
        });
      }
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build blocks with text in between
  matches.forEach(({ index, length, block }) => {
    // Add text before this block
    if (index > lastIndex) {
      const textContent = text.slice(lastIndex, index).trim();
      if (textContent) {
        blocks.push({ type: "text", content: textContent });
      }
    }

    blocks.push(block);
    lastIndex = index + length;
  });

  // Add any remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex).trim();
    if (remainingText) {
      blocks.push({ type: "text", content: remainingText });
    }
  }

  // If no blocks were found, return the entire text as a text block
  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: "text", content: text });
  }

  return blocks;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    json: "json",
    html: "html",
    py: "python",
    java: "java",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    dart: "dart",
    vue: "vue",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sh: "bash",
    bash: "bash",
    sql: "sql",
  };
  return languageMap[ext || ""] || "plaintext";
}

function getLanguageIcon(language: string): string {
  const iconMap: Record<string, string> = {
    typescript: "TS",
    tsx: "TSX",
    javascript: "JS",
    jsx: "JSX",
    css: "CSS",
    scss: "SCSS",
    json: "JSON",
    html: "HTML",
    python: "PY",
    java: "JAVA",
    go: "GO",
    rust: "RS",
    ruby: "RB",
    php: "PHP",
  };
  return iconMap[language] || language.toUpperCase().slice(0, 4);
}

function CodeHighlighter({ code, language }: { code: string; language: string }) {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [isHighlighting, setIsHighlighting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const highlightCode = async () => {
      try {
        setIsHighlighting(true);

        // Try primary language first
        let html: string;
        try {
          html = await codeToHtml(code, {
            lang: language,
            theme: "github-dark",
          });
        } catch (langError) {
          // If language fails, try fallback languages
          console.warn(`Failed to highlight with language "${language}", trying fallback`, langError);
          const fallbackLang = language === "plaintext" ? "text" : "text";
          try {
            html = await codeToHtml(code, {
              lang: fallbackLang,
              theme: "github-dark",
            });
          } catch (fallbackError) {
            // If that also fails, use plain text HTML
            console.error("All highlighting attempts failed, using plain text", fallbackError);
            html = `<pre class="shiki github-dark" style="background-color:#0d1117;color:#e6edf3;padding:12px;margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.5;overflow-x:auto" tabindex="0"><code>${escapeHtml(code)}</code></pre>`;
          }
        }

        if (!cancelled) {
          setHighlightedHtml(html);
          setIsHighlighting(false);
        }
      } catch (error) {
        console.error("Fatal error in highlighting:", error);
        // Fallback to plain text display
        if (!cancelled) {
          const fallbackHtml = `<pre class="shiki github-dark" style="background-color:#0d1117;color:#e6edf3;padding:12px;margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.5;overflow-x:auto" tabindex="0"><code>${escapeHtml(code)}</code></pre>`;
          setHighlightedHtml(fallbackHtml);
          setIsHighlighting(false);
        }
      }
    };

    highlightCode();

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (isHighlighting) {
    return (
      <div className="p-3 text-sm text-text-secondary/60 animate-pulse">
        Highlighting...
      </div>
    );
  }

  return (
    <div
      className="shiki-wrapper"
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      style={{
        fontSize: "13px",
        lineHeight: "1.5",
        overflow: "auto",
      }}
    />
  );
}

function FileBlockDisplay({
  block,
  isLastBlock,
  isStreaming
}: {
  block: FileBlock;
  isLastBlock: boolean;
  isStreaming: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[#1e3a4d] overflow-hidden bg-[#0a1419]">
      {/* File header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0f1922] border-b border-[#1e3a4d]">
        <IconFile size={14} className="text-text-secondary/60" />
        <span className="text-xs font-mono text-text-secondary flex-1">
          {block.filePath}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1e3a4d] text-text-secondary/80">
          {getLanguageIcon(block.language)}
        </span>
        <button
          onClick={copyToClipboard}
          className="p-1 hover:bg-[#1e3a4d] rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            <IconCheck size={14} className="text-green-400" />
          ) : (
            <IconCopy size={14} className="text-text-secondary/60" />
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="relative">
        <CodeHighlighter code={block.code} language={block.language} />
        {isStreaming && isLastBlock && (
          <div className="absolute bottom-2 right-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

function SearchReplaceBlockDisplay({
  block,
  isLastBlock,
  isStreaming
}: {
  block: SearchReplaceBlock;
  isLastBlock: boolean;
  isStreaming: boolean;
}) {
  const [copiedSearch, setCopiedSearch] = useState(false);
  const [copiedReplace, setCopiedReplace] = useState(false);

  const copySearchToClipboard = async () => {
    await navigator.clipboard.writeText(block.searchCode);
    setCopiedSearch(true);
    setTimeout(() => setCopiedSearch(false), 2000);
  };

  const copyReplaceToClipboard = async () => {
    await navigator.clipboard.writeText(block.replaceCode);
    setCopiedReplace(true);
    setTimeout(() => setCopiedReplace(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[#1e3a4d] overflow-hidden bg-[#0a1419]">
      {/* File header with operation type */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0f1922] border-b border-[#1e3a4d]">
        <IconReplace size={14} className="text-orange-400" />
        <span className="text-xs font-mono text-text-secondary flex-1">
          {block.filePath || "Unknown file"}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-900/30 text-orange-400">
          EDIT
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1e3a4d] text-text-secondary/80">
          {getLanguageIcon(block.language)}
        </span>
      </div>

      {/* Search section */}
      <div className="border-b border-[#1e3a4d]">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#3a1f1f]">
          <IconSearch size={14} className="text-red-400" />
          <span className="text-xs font-semibold text-red-400 flex-1">
            SEARCH
          </span>
          <button
            onClick={copySearchToClipboard}
            className="p-1 hover:bg-red-900/30 rounded transition-colors"
            title="Copy search code"
          >
            {copiedSearch ? (
              <IconCheck size={14} className="text-green-400" />
            ) : (
              <IconCopy size={14} className="text-red-400/60" />
            )}
          </button>
        </div>
        <div className="relative">
          <CodeHighlighter code={block.searchCode} language={block.language} />
        </div>
      </div>

      {/* Replace section */}
      <div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1f3a1f]">
          <IconReplace size={14} className="text-green-400" />
          <span className="text-xs font-semibold text-green-400 flex-1">
            REPLACE
          </span>
          <button
            onClick={copyReplaceToClipboard}
            className="p-1 hover:bg-green-900/30 rounded transition-colors"
            title="Copy replace code"
          >
            {copiedReplace ? (
              <IconCheck size={14} className="text-green-400" />
            ) : (
              <IconCopy size={14} className="text-green-400/60" />
            )}
          </button>
        </div>
        <div className="relative">
          <CodeHighlighter code={block.replaceCode} language={block.language} />
          {isStreaming && isLastBlock && (
            <div className="absolute bottom-2 right-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function StreamingPreview({ streamingText, isStreaming = true }: StreamingPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [debouncedText, setDebouncedText] = useState(streamingText);

  // Debounce parsing during active streaming to prevent freezing
  useEffect(() => {
    if (!isStreaming) {
      // If not streaming, parse immediately
      setDebouncedText(streamingText);
      return;
    }

    // During streaming, debounce aggressively
    const timer = setTimeout(() => {
      setDebouncedText(streamingText);
    }, 150); // Only parse every 150ms during streaming

    return () => clearTimeout(timer);
  }, [streamingText, isStreaming]);

  // Parse the debounced text
  const contentBlocks = useMemo(() => {
    return parseStreamingContent(debouncedText);
  }, [debouncedText]);

  // Always use the latest text for stats, even if parsing is debounced
  if (!streamingText) {
    return null;
  }

  const tokenCount = streamingText.split(/\s+/).filter(Boolean).length;
  const charCount = streamingText.length;
  const fileBlockCount = contentBlocks.filter(b => b.type === "file").length;
  const searchReplaceCount = contentBlocks.filter(b => b.type === "search-replace").length;

  return (
    <div className="rounded-2xl border border-[#2a4a5d] bg-gradient-to-br from-[#0f1922] to-[#162028] shadow-brand-sm animate-slide-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {isStreaming ? "Streaming Preview" : "Stream Complete"}
          </div>
          <div className="text-xs text-text-secondary/60">
            {fileBlockCount > 0 && `${fileBlockCount} ${fileBlockCount === 1 ? "file" : "files"}`}
            {fileBlockCount > 0 && searchReplaceCount > 0 && " • "}
            {searchReplaceCount > 0 && `${searchReplaceCount} ${searchReplaceCount === 1 ? "edit" : "edits"}`}
            {(fileBlockCount > 0 || searchReplaceCount > 0) && " • "}
            {tokenCount} words • {charCount} chars
          </div>
          {!isStreaming && process.env.NODE_ENV === "development" && (
            <div className="text-xs text-green-400">
              [DEV MODE]
            </div>
          )}
        </div>
        {isExpanded ? (
          <IconChevronUp size={16} className="text-text-secondary" />
        ) : (
          <IconChevronDown size={16} className="text-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-[#1e3a4d]">
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
            <div className="space-y-3 p-4">
              {contentBlocks.length === 0 && isStreaming ? (
                <div className="flex items-center gap-2 text-sm text-text-secondary/60">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span>Parsing response...</span>
                </div>
              ) : (
                contentBlocks.map((block, index) => {
                  if (block.type === "file") {
                    return (
                      <FileBlockDisplay
                        key={index}
                        block={block}
                        isLastBlock={index === contentBlocks.length - 1}
                        isStreaming={isStreaming}
                      />
                    );
                  }

                  if (block.type === "search-replace") {
                    return (
                      <SearchReplaceBlockDisplay
                        key={index}
                        block={block}
                        isLastBlock={index === contentBlocks.length - 1}
                        isStreaming={isStreaming}
                      />
                    );
                  }

                  return null;
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
