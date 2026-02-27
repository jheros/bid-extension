import LabeledInput from "../ui/LabeledInput";

export default function SettingsForm({
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
  onSubmit,
}) {
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
          <label className="text-sm font-medium text-gray-700">Use OpenRouter for extraction</label>
          <input
            type="checkbox"
            checked={useAiExtractor}
            onChange={(e) => setUseAiExtractor(e.target.checked)}
            className="h-4 w-4"
          />
        </div>
      </div>

      <div className="space-y-3">
        <LabeledInput
          label="API Key"
          type="password"
          value={deepseekApiKey}
          onChange={(e) => setDeepseekApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <LabeledInput
          label="Free Model"
          value={deepseekModel}
          onChange={(e) => setDeepseekModel(e.target.value)}
          placeholder="arcee-ai/trinity-large-preview:free"
          small="Recommended: arcee-ai/trinity-large-preview:free"
        />
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
