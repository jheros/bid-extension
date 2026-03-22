import { getSupabaseClient, isSupabaseConfigured } from './client.js';
import { getSupabaseClientWithSession, refreshSupabaseSession } from './auth.js';
import { toAppliedAtUtcIso } from '../../lib/datetime.js';
import { detectPlatformFromUrl } from '../../lib/platform.js';

const TABLE = 'job_applications';
const DUPLICATE_CODE = '23505';
const JWT_ERROR_CODES = ['PGRST301'];

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
    resume: data.resume || null,
    url: data.url,
    platform,
    applied_at,
    profile_id: data.profileId || null,
  };
}

export async function saveToSupabase(data) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase URL and Anon Key must be set in extension/src/config.js');
  }
  const payload = buildPayload(data);
  let client = await getSupabaseClientWithSession();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.id) throw new Error('Session invalid. Please sign in again.');
  payload.user_id = user.id;

  // Duplicate check:
  // - Saving with profile A → blocked if (profile=A) OR (profile=null) already exists.
  // - Saving with no profile → blocked if ANY row (any profile or none) already exists.
  let dupQuery = client
    .from(TABLE)
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', user.id)
    .eq('url', payload.url)
    .eq('job_title', payload.job_title)
    .eq('company', payload.company);
  if (payload.profile_id) {
    dupQuery = dupQuery.or(`profile_id.eq.${payload.profile_id},profile_id.is.null`);
  }
  const { count: dupCount } = await dupQuery;
  if (dupCount > 0) throw new Error('DUPLICATE_APPLICATION');

  let result = await client.from(TABLE).insert(payload).select().single();

  if (result.error) {
    if (result.error.code === DUPLICATE_CODE) throw new Error('DUPLICATE_APPLICATION');
    if (result.error.message?.includes('JWT') || JWT_ERROR_CODES.includes(result.error.code)) {
      const { authRefreshToken } = await chrome.storage.local.get('authRefreshToken');
      const newToken = await refreshSupabaseSession(authRefreshToken);
      client = await getSupabaseClient({
        access_token: newToken,
        refresh_token: (await chrome.storage.local.get('authRefreshToken')).authRefreshToken,
      });
      result = await client.from(TABLE).insert(payload).select().single();
      if (result.error) {
        if (result.error.code === DUPLICATE_CODE) throw new Error('DUPLICATE_APPLICATION');
        throw new Error(result.error.message || 'Failed to save application');
      }
      return result.data;
    }
    throw new Error(result.error.message || 'Failed to save application');
  }
  return result.data;
}

/**
 * Get applications for the current user at the given company (read-only), scoped by profile.
 * Same company under a different profile does not match. Global (no profile) only matches null profile_id.
 * @param {string} company - Company name
 * @param {string|null|undefined} profileId - Selected profile UUID, or nullish for global
 * @returns {Promise<Array<{ job_title: string, applied_at: string }>>}
 */
export async function getApplicationsByCompanyFromSupabase(company, profileId) {
  if (!isSupabaseConfigured() || !company?.trim()) return [];
  const client = await getSupabaseClientWithSession();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.id) return [];
  let q = client
    .from(TABLE)
    .select('job_title, applied_at')
    .eq('user_id', user.id)
    .eq('company', company.trim());
  if (profileId) {
    q = q.eq('profile_id', profileId);
  } else {
    q = q.is('profile_id', null);
  }
  const { data, error } = await q.order('applied_at', { ascending: false });
  if (error) return [];
  return data || [];
}
