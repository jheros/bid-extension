import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../../config.js';

const AUTH_OPTIONS = { persistSession: false, autoRefreshToken: false };

/**
 * Create a Supabase client, optionally with an existing session.
 */
export async function getSupabaseClient(session = null) {
  const url = supabaseUrl?.trim();
  const key = supabaseAnonKey?.trim();
  if (!url || !key) throw new Error('Supabase URL and Anon Key must be set in extension/src/config.js');
  const client = createClient(url, key, { auth: AUTH_OPTIONS });
  if (session?.access_token && session?.refresh_token) {
    await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }
  return client;
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());
}

export { supabaseUrl, supabaseAnonKey };
