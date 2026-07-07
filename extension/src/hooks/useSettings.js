import { useState, useEffect, useCallback } from "react";

const DEFAULT_BACKEND = "https://bid-extension.vercel.app";
const DEFAULT_OPENROUTER_MODEL = "arcee-ai/trinity-large-preview:free";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_PROVIDER = "openrouter";

export function useSettings() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [useAiExtractor, setUseAiExtractor] = useState(true);
  const [aiProvider, setAiProvider] = useState(DEFAULT_PROVIDER);
  // OpenRouter credentials use the legacy deepseek* storage keys.
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekModel, setDeepseekModel] = useState(DEFAULT_OPENROUTER_MODEL);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState(DEFAULT_OPENAI_MODEL);
  const [clearAfterSave, setClearAfterSave] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get([
        "backendUrl",
        "useAiExtractor",
        "aiProvider",
        "deepseekApiKey",
        "deepseekModel",
        "openaiApiKey",
        "openaiModel",
        "clearAfterSave",
      ]);
      if (result.backendUrl) setBackendUrl(result.backendUrl);
      else setBackendUrl(DEFAULT_BACKEND);
      setUseAiExtractor(Boolean(result.useAiExtractor));
      setAiProvider(result.aiProvider === "openai" ? "openai" : DEFAULT_PROVIDER);
      setDeepseekApiKey(result.deepseekApiKey || "");
      setDeepseekModel(result.deepseekModel || DEFAULT_OPENROUTER_MODEL);
      setOpenaiApiKey(result.openaiApiKey || "");
      setOpenaiModel(result.openaiModel || DEFAULT_OPENAI_MODEL);
      setClearAfterSave(result.clearAfterSave !== false);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, []);

  const saveSettings = useCallback(
    async (e, showStatus) => {
      e?.preventDefault?.();
      await chrome.storage.local.set({
        backendUrl: backendUrl.trim().replace(/\/$/, ""),
        useAiExtractor,
        aiProvider,
        deepseekApiKey: deepseekApiKey.trim(),
        deepseekModel: deepseekModel.trim() || DEFAULT_OPENROUTER_MODEL,
        openaiApiKey: openaiApiKey.trim(),
        openaiModel: openaiModel.trim() || DEFAULT_OPENAI_MODEL,
        clearAfterSave,
      });
      if (showStatus) showStatus("Settings saved!", "success");
      chrome.runtime.sendMessage({
        type: "SHOW_NOTIFICATION",
        data: { title: "Settings saved", message: "Your settings have been saved." },
      });
    },
    [
      backendUrl,
      useAiExtractor,
      aiProvider,
      deepseekApiKey,
      deepseekModel,
      openaiApiKey,
      openaiModel,
      clearAfterSave,
    ],
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    backendUrl,
    setBackendUrl,
    useAiExtractor,
    setUseAiExtractor,
    aiProvider,
    setAiProvider,
    deepseekApiKey,
    setDeepseekApiKey,
    deepseekModel,
    setDeepseekModel,
    openaiApiKey,
    setOpenaiApiKey,
    openaiModel,
    setOpenaiModel,
    clearAfterSave,
    setClearAfterSave,
    loadSettings,
    saveSettings,
  };
}
