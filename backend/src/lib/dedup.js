export const DEDUP_SIMILARITY_THRESHOLD = 0.6;

export function jaccardSimilarity(a, b) {
  if (!a || !b) return 0;
  const tokenize = (text) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export async function deduplicateJob(supabase, { externalId, title, companyName, description }) {
  try {
    const { data: candidates, error } = await supabase
      .from('scraped_jobs')
      .select('id, description')
      .ilike('title', title)
      .ilike('company_name', companyName)
      .neq('external_id', externalId)
      .eq('is_active', true);

    if (error) {
      console.error('[dedup] Query error:', error.message);
      return;
    }

    for (const candidate of candidates || []) {
      const similarity = jaccardSimilarity(description, candidate.description);
      if (similarity >= DEDUP_SIMILARITY_THRESHOLD) {
        const { error: updateError } = await supabase
          .from('scraped_jobs')
          .update({ is_active: false })
          .eq('id', candidate.id);
        if (updateError) {
          console.error(`[dedup] Failed to soft-delete job ${candidate.id}:`, updateError.message);
        } else {
          console.log(`[dedup] Soft-deleted duplicate job ${candidate.id} (similarity=${similarity.toFixed(2)})`);
        }
      }
    }
  } catch (err) {
    console.error('[dedup] Unexpected error:', err);
  }
}
