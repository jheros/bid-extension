/**
 * Seeds job_applications for a target user by copying random rows from other users.
 *
 * Usage:
 *   node scripts/seed-applications.js \
 *     --user-id <uuid> \
 *     --profile-id <uuid> \
 *     --date YYYY-MM-DD \
 *     --count <number> \
 *     [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

function parseArgs() {
  const userId    = getArg('--user-id');
  const profileId = getArg('--profile-id');
  const date      = getArg('--date');
  const countRaw  = getArg('--count');

  const missing = [];
  if (!userId)   missing.push('--user-id');
  if (!date)     missing.push('--date');
  if (!countRaw) missing.push('--count');

  if (missing.length) {
    console.error(`Missing required flags: ${missing.join(', ')}`);
    console.error('Usage: node scripts/seed-applications.js --user-id <uuid> [--profile-id <uuid>] --date YYYY-MM-DD --count <number> [--dry-run]');
    process.exit(1);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`Invalid --date format: "${date}". Expected YYYY-MM-DD.`);
    process.exit(1);
  }

  const count = parseInt(countRaw, 10);
  if (isNaN(count) || count < 1) {
    console.error(`Invalid --count: "${countRaw}". Must be a positive integer.`);
    process.exit(1);
  }

  return { userId, profileId, date, count };
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Replaces the date portion of an ISO timestamp while keeping the time-of-day.
// e.g. overrideDate('2025-03-15T14:32:00+00:00', '2026-01-20') → '2026-01-20T14:32:00+00:00'
function overrideDate(isoTimestamp, targetDate) {
  if (!isoTimestamp) return new Date(targetDate).toISOString();
  return targetDate + isoTimestamp.slice(10);
}

function transformRow(row, userId, profileId, targetDate) {
  const { id: _id, ...rest } = row;
  return {
    ...rest,
    user_id:    userId,
    profile_id: profileId,
    applied_at: overrideDate(row.applied_at, targetDate),
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchSourceRows(targetUserId, count) {
  const poolSize = Math.min(count * 10, 500);

  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .neq('user_id', targetUserId)
    .limit(poolSize)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Fetch failed: ${error.message}`);

  const pool = data || [];
  if (pool.length === 0) {
    console.error('No applications found from other users. Nothing to seed.');
    process.exit(1);
  }

  const picked = shuffle(pool).slice(0, count);

  if (picked.length < count) {
    console.warn(`Warning: only found ${picked.length} applications from other users; requested ${count}.`);
  }

  return picked;
}

async function upsertRows(rows, userId, profileId) {
  for (const row of rows) {
    let query = supabase
      .from('job_applications')
      .delete()
      .eq('user_id', userId)
      .eq('url', row.url)
      .eq('job_title', row.job_title)
      .eq('company', row.company);

    query = profileId ? query.eq('profile_id', profileId) : query.is('profile_id', null);

    const { error: delError } = await query;
    if (delError) throw new Error(`Delete conflict failed: ${delError.message}`);
  }

  const { error: insertError } = await supabase
    .from('job_applications')
    .insert(rows);

  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
}

async function main() {
  const { userId, profileId, date, count } = parseArgs();
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Target user: ${userId}`);
  console.log(`Target profile: ${profileId}`);
  console.log(`Date: ${date}`);
  console.log(`Count: ${count}\n`);

  console.log('Fetching source rows...');
  const source = await fetchSourceRows(userId, count);
  console.log(`Fetched ${source.length} source rows.`);

  const seen = new Set();
  const rows = source
    .map((r) => transformRow(r, userId, profileId, date))
    .filter((r) => {
      const key = `${r.url}|||${r.job_title}|||${r.company}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (DRY_RUN) {
    console.log('\nDry-run — rows that would be inserted:');
    console.log(JSON.stringify(rows, null, 2));
    console.log(`\n─────────────────────────────────────────`);
    console.log(`Would insert: ${rows.length} rows`);
    console.log(`Re-run without --dry-run to apply.`);
    return;
  }

  console.log('Upserting rows...');
  await upsertRows(rows, userId, profileId);

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Inserted: ${rows.length} rows`);
  console.log(`Target user:    ${userId}`);
  console.log(`Target profile: ${profileId}`);
  console.log(`Date:           ${date}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
