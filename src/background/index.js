// Background service worker with Service Account authentication

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
});

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
  const range = `${encodeURIComponent(sheetName)}!A:D`;
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
      data.company
    ]];

    // Google Sheets API endpoint - use configured sheet name
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:D:append?valueInputOption=USER_ENTERED`;

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
