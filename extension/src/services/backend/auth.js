const AUTH_KEYS = ['authToken', 'authRefreshToken', 'authEmail'];

async function clearAuthStorage() {
  await chrome.storage.local.remove(AUTH_KEYS);
}

export async function signInToBackend(email, password) {
  const { backendUrl } = await chrome.storage.local.get('backendUrl');
  if (!backendUrl) throw new Error('Backend URL is not configured in settings.');

  const response = await fetch(`${backendUrl}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Sign in failed');

  await chrome.storage.local.set({
    authToken: data.access_token,
    authRefreshToken: data.refresh_token,
    authEmail: data.user.email,
  });
  return { email: data.user.email };
}

export async function refreshBackendSession(backendUrl, refreshToken) {
  if (!refreshToken) throw new Error('Session expired. Please sign in again.');
  const response = await fetch(`${backendUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    await clearAuthStorage();
    throw new Error(data.error || 'Session expired. Please sign in again.');
  }
  await chrome.storage.local.set({
    authToken: data.access_token,
    authRefreshToken: data.refresh_token,
  });
  return data.access_token;
}
