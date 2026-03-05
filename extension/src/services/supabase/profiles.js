import { getSupabaseClientWithSession } from './auth.js';

const TABLE = 'profiles';

/**
 * Fetch all profiles for the currently signed-in user directly from Supabase.
 * @returns {Promise<Array<{ id: string, name: string, created_at: string }>>}
 */
export async function getProfilesFromSupabase() {
  const client = await getSupabaseClientWithSession();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.id) return [];
  const { data, error } = await client
    .from(TABLE)
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}
