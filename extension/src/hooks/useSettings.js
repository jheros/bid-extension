import { useState, useEffect, useCallback } from "react";

const DEFAULT_BACKEND = "https://bid-extension.vercel.app";
const DEFAULT_MODEL = "arcee-ai/trinity-large-preview:free";

export function useSettings() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [useAiExtractor, setUseAiExtractor] = useState(true);
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekModel, setDeepseekModel] = useState(DEFAULT_MODEL);
  const [clearAfterSave, setClearAfterSave] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get([
        "backendUrl",
        "useAiExtractor",
        "deepseekApiKey",
        "deepseekModel",
        "clearAfterSave",
      ]);
      if (result.backendUrl) setBackendUrl(result.backendUrl);
      else setBackendUrl(DEFAULT_BACKEND);
      setUseAiExtractor(Boolean(result.useAiExtractor));
      setDeepseekApiKey(result.deepseekApiKey || "");
      setDeepseekModel(result.deepseekModel || DEFAULT_MODEL);
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
        deepseekApiKey: deepseekApiKey.trim(),
        deepseekModel: deepseekModel.trim() || DEFAULT_MODEL,
        clearAfterSave,
      });
      if (showStatus) showStatus("Settings saved!", "success");
      chrome.runtime.sendMessage({
        type: "SHOW_NOTIFICATION",
        data: { title: "Settings saved", message: "Your settings have been saved." },
      });
    },
    [backendUrl, useAiExtractor, deepseekApiKey, deepseekModel, clearAfterSave],
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    backendUrl,
    setBackendUrl,
    useAiExtractor,
    setUseAiExtractor,
    deepseekApiKey,
    setDeepseekApiKey,
    deepseekModel,
    setDeepseekModel,
    clearAfterSave,
    setClearAfterSave,
    loadSettings,
    saveSettings,
  };
}
