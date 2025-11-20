"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
} from "@tabler/icons-react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "@/types/studio";
import { SettingsPanel } from "../Settings/SettingsPanel";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { PresetControlsPanel } from "./PresetControlsPanel";

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  streamingText?: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onReset: () => void;
  onShowHistory: () => void;
  onShowPresets: () => void;
  hasVersionHistory: boolean;
}

const PANEL_MARGIN = 16;
const PANEL_MAX_WIDTH = 400;
const DEFAULT_WIDTH = 360;
const EXPANDED_HEIGHT_RATIO = 0.8;
const FALLBACK_BASE_HEIGHT = 120;
const DEFAULT_BOTTOM_GAP = 60;
const PANEL_STORAGE_KEY = "studio.chatPanel";
const SETTINGS_COLLAPSE_STORAGE_KEY = "studio.chatPanel.settingsCollapsed";
const SETTINGS_PANEL_FALLBACK_HEIGHT = 420;

type Position = {
  left: number;
  top: number;
};

type StoredPanelState = {
  position: Position;
  isExpanded: boolean;
  bottomGap: number;
};

const calculateBottomGap = (
  viewportHeight: number | null | undefined,
  top: number,
  height: number,
) => {
  if (!viewportHeight) {
    return DEFAULT_BOTTOM_GAP;
  }
  return Math.max(PANEL_MARGIN, viewportHeight - (top + height));
};

const readPanelStateFromStorage = (): StoredPanelState | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredPanelState>;
    if (
      !parsed.position ||
      typeof parsed.position.left !== "number" ||
      typeof parsed.position.top !== "number"
    ) {
      return null;
    }
    return {
      position: parsed.position,
      isExpanded: typeof parsed.isExpanded === "boolean" ? parsed.isExpanded : false,
      bottomGap: typeof parsed.bottomGap === "number" ? parsed.bottomGap : DEFAULT_BOTTOM_GAP,
    };
  } catch {
    return null;
  }
};

const writePanelStateToStorage = (state: StoredPanelState) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(state));
};

const readSettingsCollapsedFromStorage = () => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_COLLAPSE_STORAGE_KEY);
    return raw === "true";
  } catch {
    return false;
  }
};

const writeSettingsCollapsedToStorage = (value: boolean) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SETTINGS_COLLAPSE_STORAGE_KEY, String(value));
};

export function ChatPanel({
  messages,
  input,
  loading,
  streamingText,
  onInputChange,
  onSubmit,
  onCancel,
  onReset,
  onShowHistory,
  onShowPresets,
  hasVersionHistory,
}: ChatPanelProps) {
  const settings = useStudioSettings();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragPointerIdRef = useRef<number | null>(null);
  const dragHandleRef = useRef<Element | null>(null);
  const initializedRef = useRef(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [controlsNode, setControlsNode] = useState<HTMLDivElement | null>(null);
  const [inputNode, setInputNode] = useState<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({
    left: PANEL_MARGIN,
    top: PANEL_MARGIN,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [baseHeight, setBaseHeight] = useState(FALLBACK_BASE_HEIGHT);
  const [expandedHeight, setExpandedHeight] = useState(FALLBACK_BASE_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const savedStateRef = useRef<StoredPanelState | null>(null);
  const [isPanelReady, setIsPanelReady] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(false);
  const [settingsContentNode, setSettingsContentNode] = useState<HTMLDivElement | null>(null);
  const [settingsContentHeight, setSettingsContentHeight] = useState(SETTINGS_PANEL_FALLBACK_HEIGHT);
  const collapsedHeight = baseHeight;
  const panelHeight = isExpanded ? expandedHeight : collapsedHeight;
  const panelTop = position.top;
  const prevPanelHeightRef = useRef(panelHeight);
  const bottomGapRef = useRef(DEFAULT_BOTTOM_GAP);
  const accordionHeight = Math.max(0, panelHeight - collapsedHeight);
  const handleControlsRef = useCallback((node: HTMLDivElement | null) => {
    setControlsNode(node);
  }, []);
  const handleInputRef = useCallback((node: HTMLDivElement | null) => {
    setInputNode(node);
  }, []);
  const handleSettingsContentRef = useCallback((node: HTMLDivElement | null) => {
    setSettingsContentNode(node);
  }, []);

  const releasePointerCapture = useCallback(() => {
    const pointerId = dragPointerIdRef.current;
    const handleEl = dragHandleRef.current;
    if (pointerId !== null && handleEl) {
      try {
        handleEl.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    dragPointerIdRef.current = null;
    dragHandleRef.current = null;
  }, []);

  useEffect(() => {
    if (!settingsContentNode) {
      return;
    }
    const updateHeight = () => {
      setSettingsContentHeight(settingsContentNode.scrollHeight || SETTINGS_PANEL_FALLBACK_HEIGHT);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }

    const observer = new ResizeObserver(updateHeight);
    observer.observe(settingsContentNode);
    return () => observer.disconnect();
  }, [settingsContentNode]);

  useEffect(() => {
    const saved = readPanelStateFromStorage();
    if (!saved) {
      return;
    }
    savedStateRef.current = saved;
    bottomGapRef.current = saved.bottomGap;
    setIsExpanded(saved.isExpanded);
  }, []);

  useEffect(() => {
    setIsSettingsCollapsed(readSettingsCollapsedFromStorage());
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const calculateBaseHeight = () => {
      const controlsHeight = controlsNode?.offsetHeight ?? 0;
      const inputHeight = inputNode?.offsetHeight ?? 0;
      const measured = controlsHeight + inputHeight;
      const next = measured > 0 ? measured : FALLBACK_BASE_HEIGHT;
      setBaseHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    calculateBaseHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", calculateBaseHeight);
      return () => window.removeEventListener("resize", calculateBaseHeight);
    }

    const observer = new ResizeObserver(calculateBaseHeight);
    if (controlsNode) {
      observer.observe(controlsNode);
    }
    if (inputNode) {
      observer.observe(inputNode);
    }

    return () => observer.disconnect();
  }, [controlsNode, inputNode]);

  useEffect(() => {
    setExpandedHeight((prev) => (prev < collapsedHeight ? collapsedHeight : prev));
  }, [collapsedHeight]);
  const getPanelBounds = useCallback(
    (heightOverride?: number) => {
    const fallbackWidth = viewport.width
      ? Math.max(PANEL_MARGIN * 2, viewport.width - PANEL_MARGIN * 2)
      : DEFAULT_WIDTH;
    const width = panelRef.current?.offsetWidth ?? Math.min(PANEL_MAX_WIDTH, fallbackWidth);
      const height = heightOverride ?? panelRef.current?.offsetHeight ?? panelHeight;
    return { width, height };
    },
    [panelHeight, viewport.width],
  );

  const clampPosition = useCallback(
    (next: Position, heightOverride?: number) => {
      if (!viewport.width || !viewport.height) {
        return next;
      }
      const { width, height } = getPanelBounds(heightOverride);
      const maxLeft = Math.max(PANEL_MARGIN, viewport.width - width - PANEL_MARGIN);
      const maxTop = Math.max(PANEL_MARGIN, viewport.height - height - PANEL_MARGIN);
      return {
        left: Math.min(Math.max(PANEL_MARGIN, next.left), maxLeft),
        top: Math.min(Math.max(PANEL_MARGIN, next.top), maxTop),
      };
    },
    [getPanelBounds, viewport.height, viewport.width],
  );

  const getDefaultPosition = useCallback(
    (heightOverride?: number) => {
      const targetHeight = heightOverride ?? collapsedHeight;
      if (!viewport.width || !viewport.height) {
        return {
          left: PANEL_MARGIN,
          top: PANEL_MARGIN,
        };
      }
      const { width } = getPanelBounds(targetHeight);
      const centeredLeft = viewport.width / 2 - width / 2;
      const desiredTop = viewport.height - targetHeight - DEFAULT_BOTTOM_GAP;
      return clampPosition(
        {
          left: centeredLeft,
          top: desiredTop,
        },
        targetHeight,
      );
    },
    [clampPosition, collapsedHeight, getPanelBounds, viewport.height, viewport.width],
  );

  const getGapFromBottom = useCallback(
    (heightOverride?: number) => {
      const height = heightOverride ?? panelHeight;
      return calculateBottomGap(viewport.height, panelTop, height);
    },
    [panelHeight, panelTop, viewport.height],
  );

  const computeExpandedHeight = useCallback(
    (gapFromBottom: number) => {
      if (!viewport.height) {
        return collapsedHeight;
      }
      const maxByRatio = Math.floor(viewport.height * EXPANDED_HEIGHT_RATIO);
      const available = viewport.height - gapFromBottom - PANEL_MARGIN;
      const availableSpace = Math.max(collapsedHeight, available);
      const constrained = Math.min(maxByRatio, availableSpace);
      return Math.max(collapsedHeight, constrained);
    },
    [collapsedHeight, viewport.height],
  );

  useEffect(() => {
    if (!viewport.width || !viewport.height) {
      return;
    }

    setPosition((prev) => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        const saved = savedStateRef.current;
        if (saved?.position) {
          const inferredGap =
            saved.bottomGap ??
            calculateBottomGap(viewport.height, saved.position.top, panelHeight);
          const desiredTop =
            viewport.height != null
              ? viewport.height - panelHeight - inferredGap
              : saved.position.top;
          const nextPosition = clampPosition(
            {
              left: saved.position.left,
              top: desiredTop,
            },
            panelHeight,
          );
          bottomGapRef.current = inferredGap;
          setIsPanelReady(true);
          return nextPosition;
        }
        const nextPosition = getDefaultPosition(panelHeight);
        bottomGapRef.current = DEFAULT_BOTTOM_GAP;
        setIsPanelReady(true);
        return nextPosition;
      }
      return clampPosition(prev, panelHeight);
    });
  }, [clampPosition, getDefaultPosition, panelHeight, viewport.height, viewport.width]);

  useEffect(() => {
    if (!initializedRef.current || !viewport.height) {
      prevPanelHeightRef.current = panelHeight;
      return;
    }
    const previousHeight = prevPanelHeightRef.current;
    if (Math.abs(previousHeight - panelHeight) < 1) {
      prevPanelHeightRef.current = panelHeight;
      return;
    }
    if (isDragging) {
      return;
    }
    const gap = bottomGapRef.current;
    const desiredTop = viewport.height - panelHeight - gap;
    setPosition((prev) => clampPosition({ left: prev.left, top: desiredTop }, panelHeight));
    prevPanelHeightRef.current = panelHeight;
  }, [clampPosition, isDragging, panelHeight, viewport.height]);

  useEffect(() => {
    if (!isPanelReady || isPanelVisible) {
      return;
    }
    const timer = window.setTimeout(() => {
      setIsPanelVisible(true);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [isPanelReady, isPanelVisible]);

  useEffect(() => {
    if (typeof window === "undefined" || isDragging || !initializedRef.current) {
      return;
    }
    const currentGap = calculateBottomGap(viewport.height, panelTop, panelHeight);
    bottomGapRef.current = currentGap;
    const payloadPosition: Position = {
      left: position.left,
      top: panelTop,
    };
    const payload: StoredPanelState = {
      position: payloadPosition,
      isExpanded,
      bottomGap: currentGap,
    };
    writePanelStateToStorage(payload);
    savedStateRef.current = payload;
  }, [isDragging, isExpanded, panelHeight, panelTop, viewport.height, position.left]);

  useEffect(() => {
    writeSettingsCollapsedToStorage(isSettingsCollapsed);
  }, [isSettingsCollapsed]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) {
        return;
      }
      event.preventDefault();
      const nextPosition: Position = {
        left: event.clientX - dragOffsetRef.current.x,
        top: event.clientY - dragOffsetRef.current.y,
      };
      setPosition(clampPosition(nextPosition));
    };

    const endDrag = () => {
      releasePointerCapture();
      setIsDragging(false);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragPointerIdRef.current !== null && event.pointerId !== dragPointerIdRef.current) {
        return;
      }
      endDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", endDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", endDrag);
    };
  }, [clampPosition, isDragging, releasePointerCapture]);

  const handleDragStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragPointerIdRef.current = event.pointerId;
      dragHandleRef.current = event.currentTarget;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      dragOffsetRef.current = {
        x: event.clientX - position.left,
        y: event.clientY - panelTop,
      };
      setIsDragging(true);
    },
    [position.left, panelTop],
  );

  const handleToggleExpand = useCallback(() => {
    const currentHeight = isExpanded ? expandedHeight : collapsedHeight;
    const gap = getGapFromBottom(currentHeight);
    bottomGapRef.current = gap;

    if (!viewport.height) {
      setIsExpanded((prev) => !prev);
      return;
    }

    if (isExpanded) {
      const nextTop = viewport.height - collapsedHeight - gap;
      setPosition((prev) => clampPosition({ left: prev.left, top: nextTop }, collapsedHeight));
      setIsExpanded(false);
    } else {
      const nextHeight = computeExpandedHeight(gap);
      setExpandedHeight(nextHeight);
      const nextTop = viewport.height - nextHeight - gap;
      setPosition((prev) => clampPosition({ left: prev.left, top: nextTop }, nextHeight));
      setIsExpanded(true);
    }
  }, [
    clampPosition,
    computeExpandedHeight,
    expandedHeight,
    getGapFromBottom,
    isExpanded,
    collapsedHeight,
    viewport.height,
  ]);

  const handleToggleSettingsCollapse = useCallback(() => {
    setIsSettingsCollapsed((prev) => !prev);
  }, []);

  const handleResetPanel = useCallback(() => {
    const nextPosition = getDefaultPosition(collapsedHeight);
    setIsExpanded(false);
    setPosition(nextPosition);
    const gap = calculateBottomGap(viewport.height, nextPosition.top, collapsedHeight);
    bottomGapRef.current = gap;
    savedStateRef.current = {
      position: nextPosition,
      isExpanded: false,
      bottomGap: gap,
    };
    onReset();
    writePanelStateToStorage({
      position: nextPosition,
      isExpanded: false,
      bottomGap: gap,
    });
  }, [collapsedHeight, getDefaultPosition, onReset, viewport.height]);

  const FoldIcon = isExpanded ? IconChevronDown : IconChevronUp;
  const panelStyle = {
    width: "min(400px, calc(100vw - 48px))",
    maxWidth: PANEL_MAX_WIDTH,
    height: panelHeight,
    left: position.left,
    top: position.top,
    opacity: isPanelVisible ? 1 : 0,
    pointerEvents: isPanelVisible ? ("auto" as const) : ("none" as const),
    visibility: isPanelVisible ? ("visible" as const) : ("hidden" as const),
    transition: isPanelVisible
      ? isDragging
        ? "none"
        : "height 0.35s ease, top 0.35s ease, left 0.35s ease, opacity 0.25s ease"
      : "opacity 0.25s ease",
  };
  const accordionStyle = {
    flexGrow: isExpanded ? 1 : 0,
    flexShrink: isExpanded ? 1 : 0,
    flexBasis: isExpanded ? "auto" : 0,
    height: isExpanded ? accordionHeight : 0,
    maxHeight: accordionHeight,
    transition: isDragging
      ? "none"
      : "height 0.35s ease, max-height 0.35s ease, opacity 0.35s ease, transform 0.35s ease",
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? "translateY(0)" : "translateY(12px)",
    pointerEvents: isExpanded ? ("auto" as const) : ("none" as const),
  };
  const settingsWrapperStyle = {
    maxHeight: isSettingsCollapsed ? 0 : settingsContentHeight,
    opacity: isSettingsCollapsed ? 0 : 1,
    pointerEvents: isSettingsCollapsed ? ("none" as const) : ("auto" as const),
  };
  const controlsSlot = (
    <>
      <button
        className={`inline-flex items-center justify-center rounded-full bg-background/80 p-1 text-text-secondary transition ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={handleDragStart}
        style={{ touchAction: "none" }}
        aria-label="Drag chat panel"
      >
        <IconGripVertical size={14} />
      </button>
      <button
        className="inline-flex items-center justify-center rounded-full bg-background/80 p-1 text-text-secondary transition hover:text-accent"
        onClick={handleToggleExpand}
        aria-label={isExpanded ? "Fold chat panel" : "Unfold chat panel"}
      >
        <FoldIcon size={14} />
      </button>
      <button
        className="inline-flex items-center justify-center rounded-full bg-background/80 p-1 text-text-secondary transition hover:text-accent"
        onClick={handleToggleSettingsCollapse}
        aria-label={isSettingsCollapsed ? "Show settings panel" : "Hide settings panel"}
      >
        <IconAdjustmentsHorizontal size={14} />
      </button>
    </>
  );

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-dark-base/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      style={panelStyle}
    >
      <div className="flex h-full flex-col">
        <PresetControlsPanel
          ref={handleControlsRef}
          leftSlot={controlsSlot}
          hasVersionHistory={hasVersionHistory}
          onShowHistory={onShowHistory}
          onShowPresets={onShowPresets}
          onReset={handleResetPanel}
        />

        <div className="flex flex-col overflow-hidden bg-dark-base/70" style={accordionStyle}>
          <div
            className="shrink-0 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
            style={settingsWrapperStyle}
          >
            <div ref={handleSettingsContentRef}>
              <SettingsPanel
                model={settings.model}
                onModelChange={settings.setModel}
                editMode={settings.editMode}
                onEditModeChange={settings.setEditMode}
                apiKey={settings.apiKey}
                onApiKeyChange={settings.setApiKey}
                systemPrompt={settings.systemPrompt}
                onSystemPromptChange={settings.setSystemPrompt}
              />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatMessages messages={messages} loading={loading} streamingText={streamingText} />
          </div>
        </div>

        <div ref={handleInputRef} className="mt-auto bg-dark-base/80">
          <ChatInput
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            onCancel={onCancel}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
