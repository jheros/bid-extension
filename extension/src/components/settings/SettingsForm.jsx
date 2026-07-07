import { useEffect } from "react";
import LabeledInput from "../ui/LabeledInput";
import { useOpenAiModels } from "../../hooks/useOpenAiModels";

const PROVIDER_META = {
  openrouter: {
    keyPlaceholder: "sk-or-...",
    modelPlaceholder: "anthropic/claude-haiku-4.5",
    modelHint: "e.g. anthropic/claude-haiku-4.5",
  },
  openai: {
    keyPlaceholder: "sk-...",
    modelPlaceholder: "gpt-4o-mini",
    modelHint: "e.g. gpt-4o-mini",
  },
};

export default function SettingsForm({
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
  onSubmit,
}) {
  const isOpenAI = aiProvider === "openai";
  const meta = PROVIDER_META[isOpenAI ? "openai" : "openrouter"];

  // Active provider's credential + model bindings.
  const apiKey = isOpenAI ? openaiApiKey : deepseekApiKey;
  const setApiKey = isOpenAI ? setOpenaiApiKey : setDeepseekApiKey;
  const model = isOpenAI ? openaiModel : deepseekModel;
  const setModel = isOpenAI ? setOpenaiModel : setDeepseekModel;

  // OpenAI model list (fetched live from /v1/models via the background worker).
  const { models, loading, error, reload } = useOpenAiModels();

  // Auto-load when the OpenAI provider is active and a key is present.
  useEffect(() => {
    if (isOpenAI && openaiApiKey.trim()) reload(openaiApiKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenAI]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <LabeledInput
        label="Backend URL"
        type="url"
        value={backendUrl}
        onChange={(e) => setBackendUrl(e.target.value)}
        placeholder="https://bid-extension.vercel.app"
        small="Used when Supabase is not configured in extension/src/config.js"
      />

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Clear form after save</label>
          <input
            type="checkbox"
            checked={clearAfterSave}
            onChange={(e) => {
              const checked = e.target.checked;
              setClearAfterSave(checked);
              chrome.storage.local.set({ clearAfterSave: checked });
            }}
            className="h-4 w-4"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Use AI for extraction</label>
          <input
            type="checkbox"
            checked={useAiExtractor}
            onChange={(e) => setUseAiExtractor(e.target.checked)}
            className="h-4 w-4"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Model provider</label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI (ChatGPT)</option>
          </select>
        </div>

        <LabeledInput
          label="API Key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={meta.keyPlaceholder}
        />

        {isOpenAI ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Model</label>
              <button
                type="button"
                onClick={() => reload(apiKey)}
                disabled={!apiKey.trim() || loading}
                className="text-xs text-blue-600 disabled:text-gray-400"
              >
                {loading ? "Loading…" : "Reload models"}
              </button>
            </div>
            {models.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {model && !models.includes(model) && (
                  <option value={model}>{model} (current)</option>
                )}
                {models.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={meta.modelPlaceholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
            <p className="text-xs text-gray-500">
              {error
                ? error
                : !apiKey.trim()
                  ? "Enter your API key, then Reload to list models."
                  : meta.modelHint}
            </p>
          </div>
        ) : (
          <LabeledInput
            label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={meta.modelPlaceholder}
            small={meta.modelHint}
          />
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
      >
        Save Settings
      </button>
    </form>
  );
}
