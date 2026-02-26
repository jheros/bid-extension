import { isSupabaseConfigured } from './supabase/client.js';
import { signInWithSupabase } from './supabase/auth.js';
import { signInToBackend } from './backend/auth.js';

/**
 * Sign in using Supabase or backend depending on configuration.
 */
export async function signIn(email, password) {
  const useSupabase = isSupabaseConfigured();
  if (useSupabase) return signInWithSupabase(email, password);
  return signInToBackend(email, password);
}

/**
 * Clear auth data from storage (Supabase and backend use same keys).
 */
export function signOut() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['authToken', 'authRefreshToken', 'authEmail'], () => resolve());
  });
}
