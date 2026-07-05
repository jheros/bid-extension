import { Readability } from "@mozilla/readability";

// A description below this many chars is treated as "no solid result" and the
// cascade falls through to the next tier.
const MIN_LENGTH = 200;

// Decode HTML entities using the browser's parser (safe: no script execution).
function decodeEntities(str) {
  if (!str) return "";
  const doc = new DOMParser().parseFromString(String(str), "text/html");
  return doc.documentElement.textContent || "";
}

// Turn an HTML (or entity-escaped HTML) string into readable plain text.
export function htmlToPlainText(raw) {
  if (!raw) return "";
  let html = String(raw);

  // Some sources (e.g. Greenhouse `content`) ship entity-escaped HTML
  // (&lt;p&gt;...). Decode once so the tags become real before we process them.
  if (/&lt;|&gt;/.test(html)) html = decodeEntities(html);

  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\/\s*(p|div|li|h[1-6]|tr|section|header|ul|ol|table)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, ""); // strip remaining tags

  // Decode any entities left behind inside the text (&amp;, &nbsp;, ...).
  html = decodeEntities(html);

  return html
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// --- Tier 1: Greenhouse public board API (CORS allows content-script fetch) ---
// The API returns labeled fields, so we map them directly — no AI/regex needed.
const JOB_TYPE_MAP = [
  [/full[- ]?time/i, "Full-time"],
  [/part[- ]?time/i, "Part-time"],
  [/contract/i, "Contract"],
  [/intern(ship)?/i, "Internship"],
  [/temporary|temp\b/i, "Temporary"],
];

function normalizeJobType(value) {
  if (!value) return "";
  for (const [re, label] of JOB_TYPE_MAP) if (re.test(value)) return label;
  return value; // controlled Greenhouse select value — keep as-is if unmatched
}

// Greenhouse has no dedicated work-type field; infer deterministically from
// the workplace/remote metadata or the location string (not AI).
function inferWorkType(text) {
  if (!text) return "";
  if (/\bhybrid\b/i.test(text)) return "Hybrid";
  if (/\bremote\b|work from home|\bwfh\b/i.test(text)) return "Remote";
  if (/on[- ]?site|in[- ]?office/i.test(text)) return "Onsite";
  return "";
}

function pickMetadata(metadata, nameRe) {
  const entry = (metadata || []).find((m) => nameRe.test(m?.name || ""));
  return entry?.value == null ? "" : String(entry.value);
}

function mapGreenhouseFields(json) {
  const location = json?.location?.name || "";
  const employment = pickMetadata(json?.metadata, /employment\s*type/i);
  const workplace = pickMetadata(json?.metadata, /workplace|work\s*type|remote/i);
  return {
    jobTitle: json?.title || "",
    company: json?.company_name || "",
    location,
    workType: inferWorkType(`${workplace} ${location}`),
    jobType: normalizeJobType(employment),
    salary: "",
    securityClearance: "",
  };
}

async function tryGreenhouseApi() {
  const { hostname, pathname } = window.location;
  if (!/greenhouse\.(io|com)$/.test(hostname)) return "";

  // job-boards.greenhouse.io/{token}/jobs/{id}  |  boards.greenhouse.io/{token}/jobs/{id}
  const match = pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
  if (!match) return "";
  const [, token, jobId] = match;

  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${token}/jobs/${jobId}`,
  );
  if (!res.ok) return "";
  const json = await res.json();
  // Return the description AND the API's structured fields.
  return { description: htmlToPlainText(json?.content || ""), fields: mapGreenhouseFields(json) };
}

// --- Tier 2: JSON-LD JobPosting (schema.org standard, works cross-platform) ---
function collectJsonLdNodes(parsed, out) {
  if (!parsed) return;
  if (Array.isArray(parsed)) {
    parsed.forEach((n) => collectJsonLdNodes(n, out));
    return;
  }
  if (typeof parsed === "object") {
    out.push(parsed);
    if (parsed["@graph"]) collectJsonLdNodes(parsed["@graph"], out);
  }
}

function isJobPosting(node) {
  const t = node?.["@type"];
  return t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
}

function tryJsonLd() {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  const nodes = [];
  for (const script of scripts) {
    try {
      collectJsonLdNodes(JSON.parse(script.textContent), nodes);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  const posting = nodes.find(isJobPosting);
  return posting?.description ? htmlToPlainText(posting.description) : "";
}

// --- Tier 3: embedded app state (best-effort, catches easy SPA wins) ---
function findLongDescription(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== "object") return "";
  const KEYS = ["description", "jobDescription", "content", "body"];
  for (const key of KEYS) {
    const val = obj[key];
    if (typeof val === "string" && val.trim().length >= MIN_LENGTH) return val;
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const found = findLongDescription(val, depth + 1);
      if (found) return found;
    }
  }
  return "";
}

function tryAppState() {
  const nextData = document.getElementById("__NEXT_DATA__");
  if (!nextData) return "";
  const parsed = JSON.parse(nextData.textContent);
  return htmlToPlainText(findLongDescription(parsed));
}

// --- Tier 4: Readability main-content extraction (universal fallback) ---
function tryReadability() {
  // Clone so Readability never mutates the live page DOM.
  const article = new Readability(document.cloneNode(true)).parse();
  return (article?.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

// --- Tier 5: full innerText (current behavior, last resort) ---
function fullInnerText() {
  return (document.body?.innerText || "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract a clean job description from the current page, trying the most
 * authoritative source first and degrading gracefully. When a tier exposes
 * structured, labeled fields (e.g. the Greenhouse API), they are returned in
 * `fields` so the caller can skip AI/manual extraction entirely.
 * @returns {Promise<{ source: string, description: string, length: number, fields: object|null }>}
 */
export async function extractJobDescription() {
  const tiers = [
    ["greenhouse-api", tryGreenhouseApi],
    ["json-ld", tryJsonLd],
    ["app-state", tryAppState],
    ["readability", tryReadability],
  ];

  for (const [source, fn] of tiers) {
    try {
      const raw = await fn();
      // A tier returns either a plain description string or { description, fields }.
      const description = (typeof raw === "string" ? raw : raw?.description || "").trim();
      const fields = raw && typeof raw === "object" ? raw.fields || null : null;
      if (description.length >= MIN_LENGTH) {
        return { source, description, length: description.length, fields };
      }
    } catch {
      // tier failed; fall through to the next one
    }
  }

  const fallback = fullInnerText();
  return { source: "innerText", description: fallback, length: fallback.length, fields: null };
}
