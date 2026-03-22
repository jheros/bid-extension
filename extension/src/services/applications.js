import { getBangkokDateTime } from '../lib/datetime.js';
import { isSupabaseConfigured } from './supabase/client.js';
import { saveToSupabase, getApplicationsByCompanyFromSupabase } from './supabase/applications.js';
import { saveToBackend } from './backend/applications.js';

/**
 * Save a job application. Dispatches to Supabase or backend based on configuration.
 * @param {Object} data - Form data (jobTitle, company, url, datetime, etc.)
 * @returns {Promise<Object>} Saved record or API result
 */
export async function saveApplication(data) {
  const payload = {
    ...data,
    datetime: data.datetime || getBangkokDateTime(),
  };
  const useSupabase = isSupabaseConfigured();
  if (useSupabase) return saveToSupabase(payload);
  return saveToBackend(payload);
}

/**
 * Get applications for the current user at the given company (same profile scope only).
 * Used when tracking a page to show "same company" notification.
 * - With a profile id: only rows with that profile_id.
 * - With no profile (global): only rows where profile_id is null.
 * Only Supabase is supported for this read; backend returns [].
 * @param {string} company - Company name
 * @param {string|null|undefined} profileId - Selected profile UUID, or null/undefined for global
 * @returns {Promise<Array<{ job_title: string, applied_at: string }>>}
 */
export async function getApplicationsByCompany(company, profileId) {
  if (!company?.trim()) return [];
  if (isSupabaseConfigured()) return getApplicationsByCompanyFromSupabase(company, profileId);
  return [];
}
