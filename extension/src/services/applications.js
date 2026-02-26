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
 * Get applications for the current user at the given company. Used when tracking a page to show "same company" notification.
 * Only Supabase is supported for this read; backend returns [].
 * @param {string} company - Company name
 * @returns {Promise<Array<{ job_title: string, applied_at: string }>>}
 */
export async function getApplicationsByCompany(company) {
  if (!company?.trim()) return [];
  if (isSupabaseConfigured()) return getApplicationsByCompanyFromSupabase(company);
  return [];
}
