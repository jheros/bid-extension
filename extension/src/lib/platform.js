/**
 * Detect job board platform from URL. Single source of truth for background and any URL-based logic.
 */
const PLATFORM_HOSTNAMES = [
  { key: 'greenhouse', patterns: ['greenhouse.io', 'greenhouse.com'] },
  { key: 'ashbyhq', patterns: ['ashbyhq.com'] },
  { key: 'lever', patterns: ['lever.co'] },
  { key: 'workday', patterns: ['myworkdayjobs.com', 'workday.com'] },
  { key: 'linkedin', patterns: ['linkedin.com'] },
  { key: 'indeed', patterns: ['indeed.com'] },
  { key: 'smartrecruiters', patterns: ['smartrecruiters.com'] },
  { key: 'jobvite', patterns: ['jobvite.com'] },
  { key: 'icims', patterns: ['icims.com'] },
  { key: 'workable', patterns: ['workable.com'] },
];

export function detectPlatformFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const { key, patterns } of PLATFORM_HOSTNAMES) {
      if (patterns.some((p) => hostname.includes(p))) return key;
    }
    return 'other';
  } catch {
    return 'other';
  }
}
