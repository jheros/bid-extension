import { isSupabaseConfigured } from "../supabase/client.js";
import { refreshSupabaseSession } from "../supabase/auth.js";
import { refreshBackendSession } from "./auth.js";

// Shared, cross-user job-parse cache. Both auth paths store a Supabase access token in
// `authToken`, which the backend validates via supabase.auth.getUser — so this works for
// Supabase-configured and backend-only users alike.
//
// The cache is a best-effort optimization: on any failure these helpers resolve to a
// cache-miss / no-op rather than throwing, so tracking never breaks when the backend or
// session is unavailable.

async function getSession() {
  const { backendUrl, authToken, authRefreshToken } =
    await chrome.storage.local.get([
      "backendUrl",
      "authToken",
      "authRefreshToken",
    ]);
  return { backendUrl, authToken, authRefreshToken };
}

async function refreshToken(backendUrl, authRefreshToken) {
  return isSupabaseConfigured()
    ? refreshSupabaseSession(authRefreshToken)
    : refreshBackendSession(backendUrl, authRefreshToken);
}

// Perform a fetch with a single 401 refresh-retry. Returns the Response, or null on error.
async function authedFetch(
  path,
  options,
  { backendUrl, authToken, authRefreshToken },
) {
  const doFetch = (token) =>
    fetch(`${backendUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

  let response = await doFetch(authToken);
  if (response.status === 401 && authRefreshToken) {
    const nextToken = await refreshToken(backendUrl, authRefreshToken).catch(
      () => null,
    );
    if (nextToken) response = await doFetch(nextToken);
  }
  return response;
}

/**
 * Look up a cached parse for a job URL.
 * @returns {Promise<{ cached: boolean, fields?: object, description?: string }>}
 */
export async function lookupCachedParse(url) {
  try {
    const session = await getSession();
    if (!session.backendUrl || !session.authToken || !url)
      return { cached: false };

    const response = await authedFetch(
      `/api/job-parse?url=${encodeURIComponent(url)}`,
      { method: "GET" },
      session,
    );
    if (!response?.ok) return { cached: false };
    return await response.json();
  } catch {
    return { cached: false };
  }
}

/**
 * Store a parse result in the shared cache. Best-effort; never throws.
 */
export async function storeCachedParse({ url, description, fields, model }) {
  try {
    const session = await getSession();
    if (!session.backendUrl || !session.authToken || !url || !fields) return;
    await authedFetch(
      "/api/job-parse",
      {
        method: "POST",
        body: JSON.stringify({ url, description, fields, model }),
      },
      session,
    );
  } catch {
    // best-effort — ignore
  }
}
