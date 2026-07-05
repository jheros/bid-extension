// Normalize a job posting URL into a stable cache key.
// - lowercases the host (and strips a leading "www.")
// - drops the trailing slash from the path
// - removes tracking query params, sorts the rest for stable ordering
// Path and remaining query values keep their original case (slugs can be case-sensitive).
const TRACKING_PARAM = /^(utm_|ref$|source$|gh_src$|fbclid$|gclid$|mc_)/i;

export function normalizeJobUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    const params = [...u.searchParams.entries()]
      .filter(([key]) => !TRACKING_PARAM.test(key))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = params.length
      ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&')
      : '';
    return `${host}${path}${query}`;
  } catch {
    return String(raw).trim();
  }
}
