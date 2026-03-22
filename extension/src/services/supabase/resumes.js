import { getSupabaseClientWithSession } from './auth.js';
import { isSupabaseConfigured } from './client.js';

export const RESUME_BUCKET = 'job-resumes';
/** Stored in job_applications.resume; path inside bucket is everything after this prefix */
export const STORAGE_RESUME_PREFIX = 'storage:';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXT = new Set(['pdf', 'doc', 'docx', 'txt', 'rtf']);

/**
 * Upload a resume file to Supabase Storage and return value for `resume` column.
 * @param {File} file
 * @returns {Promise<string>} e.g. storage:user_id/uuid.pdf
 */
export async function uploadResumeFile(file) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid file');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Resume must be 10 MB or smaller');
  }

  const client = await getSupabaseClientWithSession();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) throw new Error('Session invalid. Please sign in again.');

  const rawExt = (file.name.split('.').pop() || '').toLowerCase();
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : 'pdf';

  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await client.storage.from(RESUME_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw new Error(error.message || 'Failed to upload resume');

  return `${STORAGE_RESUME_PREFIX}${path}`;
}
