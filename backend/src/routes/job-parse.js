import { Router } from "express";
import supabase from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeJobUrl } from "../lib/urlNormalize.js";

const router = Router();
router.use(requireAuth);

const TABLE = "job_parse_cache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// GET /api/job-parse?url=<job url>
// Fresh hit → { cached: true, fields, description }
// Stale row → deleted (reaped on read), then { cached: false }
// No row    → { cached: false }
router.get("/", async (req, res) => {
  const url = req.query.url;
  if (!url)
    return res.status(400).json({ error: "url query param is required" });

  const urlKey = normalizeJobUrl(url);
  if (!urlKey) return res.json({ cached: false });

  const { data, error } = await supabase
    .from(TABLE)
    .select("description, fields, created_at")
    .eq("url_key", urlKey)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.json({ cached: false });

  const fresh = Date.now() - new Date(data.created_at).getTime() < TTL_MS;
  if (fresh) {
    return res.json({
      cached: true,
      fields: data.fields,
      description: data.description,
    });
  }

  // Stale: reap the row so expired entries don't accumulate.
  await supabase.from(TABLE).delete().eq("url_key", urlKey);
  return res.json({ cached: false });
});

// POST /api/job-parse  { url, description, fields, model }
// Upsert on url_key, refreshing created_at so a re-parse renews the TTL.
router.post("/", async (req, res) => {
  const { url, description, fields, model } = req.body || {};
  if (!url) return res.status(400).json({ error: "url is required" });
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return res.status(400).json({ error: "fields object is required" });
  }

  const urlKey = normalizeJobUrl(url);
  if (!urlKey)
    return res.status(400).json({ error: "url could not be normalized" });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        url_key: urlKey,
        url,
        description: description || null,
        fields,
        model: model || null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "url_key" },
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
