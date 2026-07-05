const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Claude Haiku 4.5 via OpenRouter — cheap, capable tier for bounded structured extraction.
// Verify the slug against OpenRouter's live model list; user can override via settings.
export const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';

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

export async function extractJobInfoWithAI(data) {
  const { deepseekApiKey, deepseekModel, useAiExtractor } = await chrome.storage.local.get([
    'deepseekApiKey',
    'deepseekModel',
    'useAiExtractor',
  ]);
  if (!useAiExtractor) throw new Error('AI extractor is disabled in settings.');
  if (!deepseekApiKey) throw new Error('DeepSeek API key is not configured.');

  const model = deepseekModel || DEFAULT_MODEL;
  // Prefer the cleaned description from the extractor cascade; fall back to pageText.
  const jobDescription = data?.description ?? data?.pageText ?? '';

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${deepseekApiKey}`,
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
    throw new Error(errorData.error?.message || 'Failed to extract job info with AI.');
  }

  const completion = await response.json();
  const raw = completion?.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);
  const result = {};
  for (const key of EXTRACT_KEYS) {
    result[key] = normalizeValue(parsed[key]);
  }
  return result;
}
