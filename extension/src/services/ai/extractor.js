// Provider-agnostic job-field extractor. OpenRouter and OpenAI both speak the
// OpenAI-compatible chat/completions shape, so only the endpoint, credential, and
// model differ per provider.
const PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyName: 'deepseekApiKey', // legacy key name — holds the OpenRouter credential
    modelName: 'deepseekModel',
    defaultModel: 'anthropic/claude-haiku-4.5',
  },
  openai: {
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    keyName: 'openaiApiKey',
    modelName: 'openaiModel',
    defaultModel: 'gpt-4o-mini',
  },
};

const DEFAULT_PROVIDER = 'openrouter';

const SYSTEM_PROMPT = [
  'You extract structured data from a single job posting description.',
  'Return ONLY a JSON object with exactly these keys:',
  'jobTitle, company, location, workType, jobType, salary, securityClearance.',
  'Rules:',
  '- workType: one of Remote, Hybrid, Onsite, or "".',
  '- jobType: one of Full-time, Part-time, Contract, Internship, Temporary, or "".',
  '- location: city/state/country, or "Remote" if fully remote, else "".',
  '- salary: short salary or range string if stated, else "".',
  '- securityClearance: short clearance requirement if stated, else "".',
  '- Use "" for anything not explicitly stated. Do not infer beyond the text.',
  '- Do not wrap JSON in markdown.',
].join(' ');

const EXTRACT_KEYS = [
  'jobTitle',
  'company',
  'location',
  'workType',
  'jobType',
  'salary',
  'securityClearance',
];

function normalizeValue(value) {
  return (value ?? '').toString().trim();
}

// /v1/models returns every model the account can access (chat, embeddings, tts, image…)
// with no capability flags, so we filter to chat-capable ids by id shape. Adjust here.
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';
const CHAT_MODEL_RE = /^(gpt-|chatgpt-|o1|o3|o4)/;
const NON_CHAT_RE = /(embedding|tts|whisper|audio|realtime|image|dall-e|moderation|transcribe|search|codex)/;

export async function listOpenAiModels(apiKey) {
  const key = (apiKey || '').trim();
  if (!key) throw new Error('OpenAI API key is not configured.');

  const res = await fetch(OPENAI_MODELS_URL, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list OpenAI models (${res.status}).`);
  }

  const json = await res.json();
  const ids = (json?.data || []).map((m) => m.id).filter(Boolean);
  return ids.filter((id) => CHAT_MODEL_RE.test(id) && !NON_CHAT_RE.test(id)).sort();
}

export async function extractJobInfoWithAI(data) {
  const stored = await chrome.storage.local.get([
    'aiProvider',
    'useAiExtractor',
    'deepseekApiKey',
    'deepseekModel',
    'openaiApiKey',
    'openaiModel',
  ]);
  if (!stored.useAiExtractor) throw new Error('AI extractor is disabled in settings.');

  const provider = PROVIDERS[stored.aiProvider] || PROVIDERS[DEFAULT_PROVIDER];
  const apiKey = stored[provider.keyName];
  if (!apiKey) throw new Error(`${provider.label} API key is not configured.`);

  const model = stored[provider.modelName] || provider.defaultModel;
  // Prefer the cleaned description from the extractor cascade; fall back to pageText.
  const jobDescription = data?.description ?? data?.pageText ?? '';

  const response = await fetch(provider.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ jobDescription }) },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to extract job info via ${provider.label}.`);
  }

  const completion = await response.json();
  const raw = completion?.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  const result = {};
  for (const key of EXTRACT_KEYS) {
    result[key] = normalizeValue(parsed[key]);
  }
  return { result, model };
}
