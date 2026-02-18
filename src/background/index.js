// Background service worker with Service Account authentication
const APPLICATION_STATS_HISTORY_KEY = 'applicationStatsHistory';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SHOW_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      title: request.data.title || 'Job Application Tracker',
      message: request.data.message || '',
      priority: 1
    });
  }

  if (request.type === 'SAVE_TO_SHEETS') {
    // Add datetime before saving
    const dataWithDateTime = {
      ...request.data,
      datetime: request.data.datetime || getBangkokDateTime()
    };

    saveToGoogleSheets(dataWithDateTime)
      .then(result => {
        console.log('✅ Saved to Google Sheets:', result);
        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          title: 'Job Application Saved!',
          message: `${request.data.jobTitle || 'Application'} at ${request.data.company || 'Company'} saved to Google Sheets.`,
          priority: 2
        });
        sendResponse({ success: true, result });
      })
      .catch(error => {
        if (error.message === 'DUPLICATE_APPLICATION') {
          sendResponse({ success: false, error: error.message });
          return;
        }
        console.error('❌ Failed to save:', error);
        chrome.notifications.create({
          type: 'basic',
          title: 'Job Application Save Failed',
          message: `Could not save application. Error: ${error.message}`,
          priority: 2
        });
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  if (request.type === 'EXTRACT_JOB_INFO_AI') {
    extractJobInfoWithAI(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }

  if (request.type === 'GET_APPLICATION_STATS') {
    getApplicationStats()
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }
});

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
  // const fallback = data?.fallback || {};

  const systemPrompt = [
    'You extract job posting information.',
    'Return only valid JSON with keys:',
    'jobTitle, company, location, workType, jobType, salary, securityClearance',
    'Rules:',
    '- workType should be one of: Remote, Hybrid, Onsite, or empty string. If both, return both.',
    '- jobType should be one of: Full-time, Part-time, Contract, Internship, Temporary, or empty string.',
    '- salary should be a short salary/range string if present, else empty string.',
    '- securityClearance should be a short clearance requirement string if present, else empty string.',
    '- If unknown, use empty string values.',
    '- Do not wrap JSON in markdown.'
  ].join(' ');

  const userPrompt = JSON.stringify({
    // url: data?.url || '',
    // pageTitle: data?.pageTitle || '',
    // fallback,
    jobDescription: pageText
  });

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
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to extract job info with DeepSeek.');
  }

  const completion = await response.json();
  const result = completion?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(result);

  const normalized = {
    jobTitle: (parsed.jobTitle || '').toString().trim(),
    company: (parsed.company || '').toString().trim(),
    location: (parsed.location || '').toString().trim(),
    workType: (parsed.workType || '').toString().trim(),
    jobType: (parsed.jobType || '').toString().trim(),
    salary: (parsed.salary || '').toString().trim(),
    securityClearance: (parsed.securityClearance || '').toString().trim()
  };

  return normalized;
}

// Generate JWT token for service account
async function generateJWT(serviceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // Base64url encode
  const base64url = (obj) => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const headerEncoded = base64url(header);
  const payloadEncoded = base64url(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signatureInput}.${signatureEncoded}`;
}

// Convert PEM to ArrayBuffer
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Get access token using service account
async function getAccessToken() {
  // Get service account from storage
  const { serviceAccount } = await chrome.storage.local.get('serviceAccount');

  if (!serviceAccount) {
    throw new Error('Service account not configured. Please add credentials in settings.');
  }

  // Check if we have a cached valid token
  const { cachedToken, tokenExpiry } = await chrome.storage.local.get(['cachedToken', 'tokenExpiry']);

  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    // Token is still valid (with 1 minute buffer)
    return cachedToken;
  }

  // Generate JWT
  const jwt = await generateJWT(serviceAccount);

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get access token: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Cache the token
  await chrome.storage.local.set({
    cachedToken: data.access_token,
    tokenExpiry: Date.now() + (data.expires_in * 1000)
  });

  return data.access_token;
}

// Fetch existing rows from Google Sheet
async function getSheetValues(accessToken, sheetId, sheetName) {
  const range = `${encodeURIComponent(sheetName)}!A:I`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      await chrome.storage.local.remove(['cachedToken', 'tokenExpiry']);
      throw new Error('Authentication failed. Please check your service account credentials.');
    }
    throw new Error('Failed to read sheet');
  }

  const result = await response.json();
  return result.values || [];
}

function parseBangkokDateTimeToUtcMs(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] || '0');
  const minute = Number(match[5] || '0');
  const second = Number(match[6] || '0');

  // Stored timestamps are Bangkok local time (UTC+7).
  return Date.UTC(year, month - 1, day, hour - 7, minute, second);
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

function getBangkokPeriodStartsUtc(nowUtcMs) {
  const dayBoundaryUtcHour = 1; // 08:00 Bangkok time
  const shiftedNow = new Date(nowUtcMs - dayBoundaryUtcHour * 60 * 60 * 1000);
  const y = shiftedNow.getUTCFullYear();
  const m = shiftedNow.getUTCMonth();
  const d = shiftedNow.getUTCDate();
  const dow = shiftedNow.getUTCDay(); // 0=Sun,1=Mon,...

  const dayStartUtc = Date.UTC(y, m, d, dayBoundaryUtcHour, 0, 0);
  const mondayOffset = (dow + 6) % 7;
  const weekStartUtc = dayStartUtc - mondayOffset * 24 * 60 * 60 * 1000;
  const monthStartUtc = Date.UTC(y, m, 1, dayBoundaryUtcHour, 0, 0);

  return {
    dayStartUtc,
    weekStartUtc,
    monthStartUtc,
    nowUtcMs
  };
}

function createEmptyStatsBucket() {
  return {
    total: 0,
    byPlatform: {}
  };
}

function addToBucket(bucket, platform) {
  bucket.total += 1;
  bucket.byPlatform[platform] = (bucket.byPlatform[platform] || 0) + 1;
}

function computeStatsFromHistory(history) {
  const nowUtcMs = Date.now();
  const boundaries = getBangkokPeriodStartsUtc(nowUtcMs);
  const day = createEmptyStatsBucket();
  const week = createEmptyStatsBucket();
  const month = createEmptyStatsBucket();

  for (const entry of history) {
    const timestampUtc = Number(entry?.timestampUtc);
    if (!timestampUtc || timestampUtc > nowUtcMs) continue;

    const platform = entry?.platform || 'other';

    if (timestampUtc >= boundaries.monthStartUtc) addToBucket(month, platform);
    if (timestampUtc >= boundaries.weekStartUtc) addToBucket(week, platform);
    if (timestampUtc >= boundaries.dayStartUtc) addToBucket(day, platform);
  }

  return {
    day,
    week,
    month,
    boundaries
  };
}

async function trackSavedApplication(data) {
  const parsedTs = parseBangkokDateTimeToUtcMs(data?.datetime || data?.date);
  const timestampUtc = parsedTs || Date.now();
  const platform = detectPlatformFromUrl(data?.url || '');

  const result = await chrome.storage.local.get([APPLICATION_STATS_HISTORY_KEY]);
  const history = Array.isArray(result[APPLICATION_STATS_HISTORY_KEY])
    ? result[APPLICATION_STATS_HISTORY_KEY]
    : [];

  history.push({
    id: `${timestampUtc}-${Math.random().toString(36).slice(2, 10)}`,
    timestampUtc,
    platform
  });

  await chrome.storage.local.set({ [APPLICATION_STATS_HISTORY_KEY]: history });
}

async function getApplicationStats() {
  const result = await chrome.storage.local.get([APPLICATION_STATS_HISTORY_KEY]);
  const history = Array.isArray(result[APPLICATION_STATS_HISTORY_KEY])
    ? result[APPLICATION_STATS_HISTORY_KEY]
    : [];

  return computeStatsFromHistory(history);
}

// Check if same job already exists (same url, company, job title)
function isDuplicateJob(existingRows, url, jobTitle, company) {
  const normalize = (s) => (s || '').toString().trim().toLowerCase();

  const newUrl = normalize(url);
  const newJobTitle = normalize(jobTitle);
  const newCompany = normalize(company);

  if (!newUrl && !newJobTitle && !newCompany) return false;

  // Skip header row (first row)
  const startRow = existingRows.length > 0 && existingRows[0][0] && String(existingRows[0][0]).toLowerCase().includes('date') ? 1 : 0;

  for (let i = startRow; i < existingRows.length; i++) {
    const row = existingRows[i];
    // Row: [date/time, url, jobTitle, company] -> indices 1, 2, 3
    const rowUrl = normalize(row[1]);
    const rowJobTitle = normalize(row[2]);
    const rowCompany = normalize(row[3]);

    const urlMatch = newUrl && rowUrl && newUrl === rowUrl;
    const titleMatch = newJobTitle && rowJobTitle && newJobTitle === rowJobTitle;
    const companyMatch = newCompany && rowCompany && newCompany === rowCompany;

    // Same job = same url AND same company AND same job title
    if (urlMatch && titleMatch && companyMatch) {
      return true;
    }
  }
  return false;
}

// Save data to Google Sheets
async function saveToGoogleSheets(data) {
  try {
    // Get access token
    const accessToken = await getAccessToken();

    // Get Sheet ID and Sheet Name from storage
    const settings = await chrome.storage.local.get(['sheetId', 'sheetName']);

    if (!settings.sheetId) {
      throw new Error('Please configure Sheet ID in settings');
    }

    const { sheetId } = settings;
    const sheetName = settings.sheetName || 'Sheet1'; // Default to Sheet1 if not configured

    // Check for duplicate before saving
    const existingRows = await getSheetValues(accessToken, sheetId, sheetName);
    if (isDuplicateJob(existingRows, data.url, data.jobTitle, data.company)) {
      chrome.notifications.create({
        type: 'basic',
        title: 'DUPLICATE APPLICATION WARNING',
        message: `You have already applied to "${data.jobTitle || 'this position'}" at ${data.company || 'this company'}!\n\nSame URL, company and job title found in your sheet.`,
        priority: 2,
        requireInteraction: true  // Stays visible until user dismisses
      });
      throw new Error('DUPLICATE_APPLICATION');
    }

    // Prepare the data row
    const values = [[
      data.datetime || data.date,
      data.url,
      data.jobTitle,
      data.company,
      data.location || "",
      data.workType || "",
      data.jobType || "",
      data.salary || "",
      data.securityClearance || ""
    ]];

    // Google Sheets API endpoint - use configured sheet name
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:I:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      })
    });

    if (!response.ok) {
      const errorData = await response.json();

      // If token is invalid, clear cache and retry
      if (response.status === 401) {
        await chrome.storage.local.remove(['cachedToken', 'tokenExpiry']);
        throw new Error('Authentication failed. Please check your service account credentials.');
      }

      throw new Error(errorData.error?.message || 'Failed to save to Google Sheets');
    }

    const result = await response.json();
    console.log('Successfully saved to Google Sheets:', result);

    // Persist a local event log for fast stats without re-reading Sheets.
    await trackSavedApplication(data);

    return result;

  } catch (error) {
    if (error.message === 'DUPLICATE_APPLICATION') {
      throw error; // Re-throw so caller can handle (don't show generic error)
    }
    console.error('Error saving to Google Sheets:', error);
    throw error;
  }
}

// Helper function to format datetime in Bangkok timezone
function getBangkokDateTime() {
  const now = new Date();

  // Convert to Bangkok timezone (UTC+7)
  const bangkokTime = new Date(now.toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok'
  }));

  // Format as YYYY-MM-DD HH:MM:SS
  const year = bangkokTime.getFullYear();
  const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
  const day = String(bangkokTime.getDate()).padStart(2, '0');
  const hours = String(bangkokTime.getHours()).padStart(2, '0');
  const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');
  const seconds = String(bangkokTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

console.log('Job Application Tracker: Background script loaded');
