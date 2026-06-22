/**
 * One-off bulk deduplication of scraped_jobs.
 *
 * Groups active jobs by normalized (title, company_name), then within each
 * group keeps the newest job and soft-deletes older ones whose description
 * has Jaccard similarity >= THRESHOLD against the keeper.
 *
 * Usage:
 *   node scripts/dedup-scraped-jobs.js          # dry-run (no writes)
 *   node scripts/dedup-scraped-jobs.js --apply  # actually soft-delete
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const THRESHOLD = 0.6;
const ROWS_PER_PAGE = 1000;
const DRY_RUN = !process.argv.includes('--apply');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function normalize(str) {
  return (str || '').toLowerCase().trim();
}

function jaccardSimilarity(a, b) {
  if (!a || !b) return 0;
  const tokenize = (text) =>
    new Set(
      text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

async function fetchAllJobs() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('scraped_jobs')
      .select('id, external_id, title, company_name, description, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, from + ROWS_PER_PAGE - 1);

    if (error) throw new Error(`Fetch failed: ${error.message}`);
    all.push(...(data || []));
    if ((data || []).length < ROWS_PER_PAGE) break;
    from += ROWS_PER_PAGE;
  }
  return all;
}

async function softDelete(id) {
  if (DRY_RUN) return;
  const { error } = await supabase
    .from('scraped_jobs')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw new Error(`Soft-delete failed for id ${id}: ${error.message}`);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (pass --apply to write)' : 'APPLY'}\n`);

  console.log('Fetching active scraped_jobs...');
  const jobs = await fetchAllJobs();
  console.log(`Fetched ${jobs.length} active jobs.\n`);

  // Group by normalized title + company
  const groups = new Map();
  for (const job of jobs) {
    const key = `${normalize(job.title)}|||${normalize(job.company_name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(job);
  }

  const multiGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`Groups with >1 job: ${multiGroups.length}\n`);

  let totalDuplicates = 0;

  for (const group of multiGroups) {
    // Already sorted newest-first from the query; ensure order
    group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const keepers = [group[0]]; // newest is always kept

    for (let i = 1; i < group.length; i++) {
      const candidate = group[i];
      let isDuplicate = false;

      for (const keeper of keepers) {
        const sim = jaccardSimilarity(candidate.description, keeper.description);
        if (sim >= THRESHOLD) {
          isDuplicate = true;
          console.log(
            `  DUPLICATE  id=${candidate.id} ext=${candidate.external_id} ` +
            `sim=${sim.toFixed(2)} → kept id=${keeper.id}`
          );
          break;
        }
      }

      if (isDuplicate) {
        totalDuplicates++;
        await softDelete(candidate.id);
      } else {
        keepers.push(candidate);
      }
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Total duplicates found : ${totalDuplicates}`);
  console.log(`Action                 : ${DRY_RUN ? 'none (dry run)' : 'soft-deleted'}`);
  if (DRY_RUN && totalDuplicates > 0) {
    console.log(`\nRe-run with --apply to soft-delete these ${totalDuplicates} jobs.`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
