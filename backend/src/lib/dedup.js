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
  throw new Error('not implemented');
}
