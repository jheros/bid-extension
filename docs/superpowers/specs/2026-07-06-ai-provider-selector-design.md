# AI Provider Selector (OpenRouter + OpenAI)

## Context

The extension's AI field-extraction is hardwired to **OpenRouter**
(`extension/src/services/ai/openrouter.js`), using a single API key + model stored as
`deepseekApiKey` / `deepseekModel`. Users want to choose their provider — specifically to
use **ChatGPT / OpenAI models directly** (`api.openai.com`) as an alternative to
OpenRouter — with each provider keeping its own key and model so switching doesn't wipe
the other's credentials.

Both providers speak the same OpenAI-compatible `chat/completions` shape, so the extractor
logic (prompt, JSON response format, field normalization) is shared; only the endpoint,
auth key, and model differ.

Scope is deliberately limited to **two providers** (OpenRouter, OpenAI). No Anthropic-direct
or Azure OpenAI. The legacy `deepseek*` storage keys are kept for the OpenRouter slot to
avoid a risky rename + migration across the codebase.

## Decisions (confirmed)
- **OpenAI = direct API** (`https://api.openai.com/v1/chat/completions`, `sk-...` key),
  default model `gpt-4o-mini`.
- **Separate per-provider credentials** — independent key + model per provider.
- **UI shows only the active provider's** key/model fields.

## Design

### 1. Settings & storage (`useSettings.js`)
Add state + load/save for:
- `aiProvider`: `"openrouter" | "openai"` (default `"openrouter"`).
- OpenAI slot: `openaiApiKey`, `openaiModel` (default `gpt-4o-mini`).
- OpenRouter slot: keep existing `deepseekApiKey` / `deepseekModel` (documented as the
  OpenRouter credentials — no migration).

### 2. AI service (rename `services/ai/openrouter.js` → `services/ai/extractor.js`)
Shared `SYSTEM_PROMPT`, `EXTRACT_KEYS`, normalization, and request body
(`temperature: 0`, `response_format: { type: "json_object" }`). A provider map supplies the
per-provider bits:

```
openrouter → url: https://openrouter.ai/api/v1/chat/completions,
             keyName: deepseekApiKey, modelName: deepseekModel,
             defaultModel: anthropic/claude-haiku-4.5
openai     → url: https://api.openai.com/v1/chat/completions,
             keyName: openaiApiKey, modelName: openaiModel,
             defaultModel: gpt-4o-mini
```

`extractJobInfoWithAI(data)` reads `aiProvider`, resolves `{ url, apiKey, model }`, builds
the shared request, and returns `{ result, model }` (result = the 7 fields). Both providers
use `Authorization: Bearer <key>`.

Update the two importers:
- `background/index.js` — `handleExtractJobInfoAI` forwards the model:
  `sendResponse({ success: true, result: r.result, model: r.model })`.
- `hooks/useTrackPage.js` — use `aiResponse.model` for the cache-store label (removes the
  current `DEFAULT_MODEL` import from openrouter.js).

### 3. UI (`SettingsForm.jsx` + wiring in `SettingsTab.jsx`/`App.jsx`)
- Add a provider `<select>` (OpenRouter / OpenAI) at the top of the AI settings block.
- Below it, render **only the active provider's** API key + model inputs (labels and
  placeholders switch per provider; e.g. OpenAI key `sk-...`, model `gpt-4o-mini`).
- Relabel the checkbox "Use OpenRouter for extraction" → "Use AI for extraction".
- Thread the new `aiProvider` / `openaiApiKey` / `openaiModel` props through
  `App.jsx` → `SettingsTab` → `SettingsForm`.

### 4. Manifest (`public/manifest.json`)
Add `https://api.openai.com/*` to `host_permissions` (background-worker fetch bypasses CORS
only for declared hosts).

### 5. Error handling
If the active provider's key is empty, throw a provider-specific message
("OpenAI API key is not configured." / "OpenRouter API key is not configured."). Structured
sources (Greenhouse API, etc.) still bypass the LLM entirely — unchanged.

## Files
- `extension/src/hooks/useSettings.js` — new settings.
- `extension/src/services/ai/extractor.js` — NEW (renamed from `openrouter.js`), provider map.
- `extension/src/services/ai/openrouter.js` — removed (renamed).
- `extension/src/background/index.js` — import path + forward `model`.
- `extension/src/hooks/useTrackPage.js` — use `aiResponse.model`.
- `extension/src/components/settings/SettingsForm.jsx` — provider select + conditional fields.
- `extension/src/components/settings/SettingsTab.jsx`, `App.jsx` — prop threading.
- `extension/public/manifest.json` — OpenAI host permission.

## Verification
1. `cd extension && npm run build` + eslint clean.
2. Load unpacked. In Settings: select **OpenAI**, enter an `sk-...` key + `gpt-4o-mini`,
   save. On a non-Greenhouse posting press F9 → DevTools Network shows a call to
   `api.openai.com`, fields populate.
3. Switch to **OpenRouter** (its key/model persisted separately) → F9 → call goes to
   `openrouter.ai`. Confirm switching back to OpenAI still has its key.
4. Empty active-provider key → F9 shows the provider-specific error, DOM fallback used.
5. Greenhouse URL → still no LLM call (structured-fields path unchanged).
