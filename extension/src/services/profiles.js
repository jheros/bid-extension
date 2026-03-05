import { isSupabaseConfigured } from './supabase/client.js';
import { getProfilesFromSupabase } from './supabase/profiles.js';

/**
 * Fetch profiles for the current user.
 * Uses Supabase JS directly when configured, otherwise falls back to the backend REST API.
 * @returns {Promise<Array<{ id: string, name: string, created_at: string }>>}
 */
export async function getProfiles() {
  if (isSupabaseConfigured()) return getProfilesFromSupabase();

  const { backendUrl, authToken } = await chrome.storage.local.get(['backendUrl', 'authToken']);
  if (!backendUrl || !authToken) return [];
  try {
    const response = await fetch(`${backendUrl}/api/profiles`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}
