const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-r1-0528:free';

const SYSTEM_PROMPT = [
  'You extract job posting information.',
  'Return only valid JSON with keys:',
  'jobTitle, company, location, workType, jobType, salary, securityClearance',
  'Rules:',
  '- workType should be one of: Remote, Hybrid, Onsite, or empty string.',
  '- jobType should be one of: Full-time, Part-time, Contract, Internship, Temporary, or empty string.',
  '- salary should be a short salary/range string if present, else empty string.',
  '- securityClearance should be a short clearance requirement string if present, else empty string.',
  '- If unknown, use empty string values.',
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
  const pageText = data?.pageText ?? '';

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
        { role: 'user', content: JSON.stringify({ jobDescription: pageText }) },
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
