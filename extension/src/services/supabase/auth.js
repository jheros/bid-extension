import { getSupabaseClient, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './client.js';

const STORAGE_KEYS = ['authToken', 'authRefreshToken', 'authEmail'];

async function persistSession(session, user) {
  await chrome.storage.local.set({
    authToken: session.access_token,
    authRefreshToken: session.refresh_token,
    authEmail: user?.email ?? null,
  });
}

async function clearAuthStorage() {
  await chrome.storage.local.remove(STORAGE_KEYS);
}

export async function signInWithSupabase(email, password) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase URL and Anon Key must be set in extension/src/config.js');
  }
  const client = await getSupabaseClient(null);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  await persistSession(data.session, data.user);
  return { email: data.user.email };
}

export async function refreshSupabaseSession(refreshToken) {
  if (!refreshToken) throw new Error('Session expired. Please sign in again.');
  const client = await getSupabaseClient(null);
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    await clearAuthStorage();
    throw new Error(error?.message || 'Session expired. Please sign in again.');
  }
  await chrome.storage.local.set({
    authToken: data.session.access_token,
    authRefreshToken: data.session.refresh_token,
  });
  return data.session.access_token;
}

export async function getSupabaseClientWithSession() {
  const { authToken, authRefreshToken } = await chrome.storage.local.get(['authToken', 'authRefreshToken']);
  if (!authToken) throw new Error('Not signed in. Please sign in via the Settings tab.');
  return getSupabaseClient({ access_token: authToken, refresh_token: authRefreshToken });
}

export function getSupabaseConfig() {
  return { supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: supabaseAnonKey.trim() };
}
