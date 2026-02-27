import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Supabase default max rows per request */
const ROWS_PER_PAGE = 1000;

/**
 * Run a Supabase select and return all rows by fetching in batches of 1000.
 * Use when the table can have more than 1000 rows and you need the full set.
 * @param {(range: { from: number, to: number }) => Promise<{ data: any[], error: any }>} buildQuery - function that receives { from, to } and returns a query with .range(from, to) applied
 * @returns {Promise<any[]>}
 */
export async function fetchAllBatched(buildQuery) {
  const all = [];
  let from = 0;
  while (true) {
    const to = from + ROWS_PER_PAGE - 1;
    const query = buildQuery({ from, to });
    const { data, error } = await query;
    if (error) throw error;
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < ROWS_PER_PAGE) break;
    from += ROWS_PER_PAGE;
  }
  return all;
}

export default supabase;
