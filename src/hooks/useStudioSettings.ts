import { useEffect, useRef, useState } from "react";
import { MODEL_OPTIONS } from "@/config/models";
import { DEFAULT_SYSTEM_PROMPT } from "@/config/prompts";
import { config } from "@/config";
import type { StudioSettings } from "@/types/studio";

export function useStudioSettings() {
  const [model, setModel] = useState<string>(MODEL_OPTIONS[0].value);
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [editMode, setEditMode] = useState<"full" | "patch">("patch");
  const settingsLoadedRef = useRef(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(config.storage.settingsKey);
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
        if (parsed.editMode === "patch" || parsed.editMode === "full") {
          setEditMode(parsed.editMode);
        }
      }
    } catch (error) {
      console.warn("Failed to load stored settings", error);
    } finally {
      settingsLoadedRef.current = true;
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!settingsLoadedRef.current || typeof window === "undefined") return;
    const payload: StudioSettings = {
      model,
      apiKey,
      systemPrompt,
      editMode,
    };
    try {
      localStorage.setItem(config.storage.settingsKey, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist settings", error);
    }
  }, [model, apiKey, systemPrompt, editMode]);

  return {
    model,
    setModel,
    apiKey,
    setApiKey,
    systemPrompt,
    setSystemPrompt,
    editMode,
    setEditMode,
  };
}
