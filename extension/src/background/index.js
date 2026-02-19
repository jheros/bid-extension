

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: request.data.title || 'Job Application Tracker',
      message: request.data.message || '',
      priority: 1
    });
  }

  if (request.type === 'SAVE_APPLICATION') {
    const dataWithDateTime = {
      ...request.data,
      datetime: request.data.datetime || getBangkokDateTime()
    };

    saveToBackend(dataWithDateTime)
      .then(result => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: `Job Application Saved!`,
          message: `${request.data.jobTitle || 'Application'} at ${request.data.company || 'Company'} saved successfully.`,
          priority: 2
        });
        sendResponse({ success: true, result });
      })
      .catch(error => {
        if (error.message === 'DUPLICATE_APPLICATION') {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon48.png'),
            title: 'DUPLICATE APPLICATION WARNING',
            message: `You have already applied to "${request.data.jobTitle || 'this position'}" at ${request.data.company || 'this company'}!`,
            priority: 2,
            requireInteraction: true
          });
          sendResponse({ success: false, error: error.message });
          return;
        }
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Save Failed',
          message: `Could not save application. Error: ${error.message}`,
          priority: 2
        });
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (request.type === 'BACKEND_SIGNIN') {
    signInToBackend(request.data.email, request.data.password)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.type === 'BACKEND_SIGNOUT') {
    chrome.storage.local.remove(['authToken', 'authEmail'], () =>
      sendResponse({ success: true })
    );
    return true;
  }

  if (request.type === 'EXTRACT_JOB_INFO_AI') {
    extractJobInfoWithAI(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

});

async function signInToBackend(email, password) {
  const { backendUrl } = await chrome.storage.local.get('backendUrl');
  if (!backendUrl) throw new Error('Backend URL is not configured in settings.');

  const response = await fetch(`${backendUrl}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Sign in failed');

  await chrome.storage.local.set({
    authToken: data.access_token,
    authEmail: data.user.email
  });

  return { email: data.user.email };
}

async function saveToBackend(data) {
  const settings = await chrome.storage.local.get(['backendUrl', 'authToken']);

  if (!settings.backendUrl) throw new Error('Backend URL is not configured in settings.');
  if (!settings.authToken) throw new Error('Not signed in. Please sign in via the Settings tab.');

  const platform = detectPlatformFromUrl(data.url || '');

  // data.datetime is Bangkok (GMT+7); parse as Bangkok and convert to UTC ISO for backend
  const bangkokDatetime = data.datetime || getBangkokDateTime();
  const appliedAtUtcMs = parseBangkokDateTimeToUtcMs(bangkokDatetime);
  const applied_at =
    appliedAtUtcMs != null
      ? new Date(appliedAtUtcMs).toISOString()
      : new Date().toISOString();

  const response = await fetch(`${settings.backendUrl}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.authToken}`
    },
    body: JSON.stringify({
      job_title: data.jobTitle,
      company: data.company,
      location: data.location || null,
      work_type: data.workType || null,
      job_type: data.jobType || null,
      salary: data.salary || null,
      security_clearance: data.securityClearance || null,
      url: data.url,
      platform,
      applied_at
    })
  });

  if (response.status === 409) throw new Error('DUPLICATE_APPLICATION');

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to save application');

  return result;
}

async function extractJobInfoWithAI(data) {
  const settings = await chrome.storage.local.get([
    'deepseekApiKey',
    'deepseekModel',
    'useAiExtractor'
  ]);

  const deepseekApiKey = settings.deepseekApiKey || '';
  const deepseekModel = settings.deepseekModel || 'deepseek-chat';
  const useAiExtractor = Boolean(settings.useAiExtractor);

  if (!useAiExtractor) {
    throw new Error('AI extractor is disabled in settings.');
  }
  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key is not configured.');
  }

  const model = deepseekModel || 'deepseek/deepseek-r1-0528:free';
  const pageText = (data?.pageText || '');

  const systemPrompt = [
    'You extract job posting information.',
    'Return only valid JSON with keys:',
    'jobTitle, company, location, workType, jobType, salary, securityClearance',
    'Rules:',
    '- workType should be one of: Remote, Hybrid, Onsite, or empty string.',
    '- jobType should be one of: Full-time, Part-time, Contract, Internship, Temporary, or empty string.',
    '- salary should be a short salary/range string if present, else empty string.',
    '- securityClearance should be a short clearance requirement string if present, else empty string.',
    '- If unknown, use empty string values.',
    '- Do not wrap JSON in markdown.'
  ].join(' ');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${deepseekApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ jobDescription: pageText }) }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to extract job info with AI.');
  }

  const completion = await response.json();
  const result = completion?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(result);

  return {
    jobTitle: (parsed.jobTitle || '').toString().trim(),
    company: (parsed.company || '').toString().trim(),
    location: (parsed.location || '').toString().trim(),
    workType: (parsed.workType || '').toString().trim(),
    jobType: (parsed.jobType || '').toString().trim(),
    salary: (parsed.salary || '').toString().trim(),
    securityClearance: (parsed.securityClearance || '').toString().trim()
  };
}

function detectPlatformFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('greenhouse.io') || hostname.includes('greenhouse.com')) return 'greenhouse';
    if (hostname.includes('ashbyhq.com')) return 'ashbyhq';
    if (hostname.includes('lever.co')) return 'lever';
    if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) return 'workday';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('indeed.com')) return 'indeed';
    if (hostname.includes('smartrecruiters.com')) return 'smartrecruiters';
    if (hostname.includes('jobvite.com')) return 'jobvite';
    if (hostname.includes('icims.com')) return 'icims';
    if (hostname.includes('workable.com')) return 'workable';
    return 'other';
  } catch {
    return 'other';
  }
}

function parseBangkokDateTimeToUtcMs(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
  return Date.UTC(+y, +mo - 1, +d, +h - 7, +mi, +s);
}

function getBangkokDateTime() {
  const bangkokTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const pad = (n) => String(n).padStart(2, '0');
  return `${bangkokTime.getFullYear()}-${pad(bangkokTime.getMonth() + 1)}-${pad(bangkokTime.getDate())} ${pad(bangkokTime.getHours())}:${pad(bangkokTime.getMinutes())}:${pad(bangkokTime.getSeconds())}`;
}

console.log('Job Application Tracker: Background script loaded');
