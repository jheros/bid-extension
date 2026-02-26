import { toAppliedAtUtcIso } from '../../lib/datetime.js';
import { detectPlatformFromUrl } from '../../lib/platform.js';
import { refreshBackendSession } from './auth.js';

function buildPayload(data) {
  const applied_at = toAppliedAtUtcIso(data.datetime);
  const platform = detectPlatformFromUrl(data.url || '');
  return {
    job_title: data.jobTitle,
    company: data.company,
    location: data.location || null,
    work_type: data.workType || null,
    job_type: data.jobType || null,
    salary: data.salary || null,
    security_clearance: data.securityClearance || null,
    url: data.url,
    platform,
    applied_at,
  };
}

async function postApplication(backendUrl, accessToken, payload) {
  const response = await fetch(`${backendUrl}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  return { response, data: await response.json().catch(() => ({})) };
}

export async function saveToBackend(data) {
  const { backendUrl, authToken, authRefreshToken } = await chrome.storage.local.get([
    'backendUrl',
    'authToken',
    'authRefreshToken',
  ]);
  if (!backendUrl) throw new Error('Backend URL is not configured in settings.');
  if (!authToken) throw new Error('Not signed in. Please sign in via the Settings tab.');

  const payload = buildPayload(data);
  let { response, data: result } = await postApplication(backendUrl, authToken, payload);

  if (response.status === 401) {
    const nextToken = await refreshBackendSession(backendUrl, authRefreshToken);
    const retry = await postApplication(backendUrl, nextToken, payload);
    response = retry.response;
    result = retry.data;
  }
  if (response.status === 409) throw new Error('DUPLICATE_APPLICATION');
  if (!response.ok) throw new Error(result.error || 'Failed to save application');
  return result;
}
