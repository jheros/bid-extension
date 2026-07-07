import { useState, useCallback } from "react";

// Fetches the account's chat-capable OpenAI models via the background worker
// (GET /v1/models). Best-effort: errors surface via `error` and leave `models` empty
// so the caller can fall back to a manual text input.
export function useOpenAiModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback((apiKey) => {
    const key = (apiKey || "").trim();
    if (!key) {
      setModels([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    chrome.runtime.sendMessage(
      { type: "LIST_OPENAI_MODELS", data: { apiKey: key } },
      (response) => {
        setLoading(false);
        if (response?.success) {
          setModels(response.models || []);
          setError("");
        } else {
          setModels([]);
          setError(response?.error || "Failed to load models.");
        }
      },
    );
  }, []);

  return { models, loading, error, reload };
}
