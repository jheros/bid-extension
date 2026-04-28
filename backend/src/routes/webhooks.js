import { Router } from 'express';
import crypto from 'crypto';
import supabase from '../lib/supabase.js';

const router = Router();

function verifySignature(rawBody, signature) {
  const secret = process.env.APIFY_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV === 'PRODUCTION';
  if (!signature) return false;
  const expected = `SHA256:${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function toStr(val) {
  if (val == null) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function toDatetime(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

async function processDataset(datasetId) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    console.error('[webhook] APIFY_API_TOKEN not set — skipping dataset processing');
    return;
  }
  try {
    const url = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);
    url.searchParams.set('token', token);
    url.searchParams.set('clean', 'true');
    url.searchParams.set('format', 'json');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      console.error(`[webhook] Apify fetch failed: ${res.status} ${res.statusText}`);
      return;
    }
    const items = await res.json();
    if (!items?.length) {
      console.warn(`[webhook] No items in dataset ${datasetId}`);
      return;
    }

    let upserted = 0;
    for (const item of items) {
      const externalId = item.id;
      if (!externalId) continue;

      const { error } = await supabase.from('scraped_jobs').upsert(
        {
          external_id: String(externalId),
          title: item.title || null,
          company_name: item.organization || null,
          location: toStr(item.locations_raw),
          job_url: item.url || null,
          description: toStr(item.description_text),
          posted_date: toDatetime(item.date_posted),
          salary_min: toStr(item.ai_salary_minvalue),
          salary_max: toStr(item.ai_salary_maxvalue),
          experience: toStr(item.ai_experience_level),
          work_type: toStr(item.ai_work_arrangement),
          remote_location: toStr(item.ai_remote_location),
          company_domain: toStr(item.domain_derived),
          employment_type: toStr(item.employment_type),
          ai_core_responsibilities: toStr(item.ai_core_responsibilities),
          ai_requirements_summary: toStr(item.ai_requirements_summary),
          is_active: true,
        },
        { onConflict: 'external_id' }
      );

      if (error) {
        console.error(`[webhook] Upsert error for external_id ${externalId}:`, error.message);
      } else {
        upserted++;
      }
    }

    console.log(`[webhook] Processed ${upserted}/${items.length} jobs from dataset ${datasetId}`);
  } catch (err) {
    console.error('[webhook] processDataset error:', err);
  }
}

router.post('/apify', async (req, res) => {
  const rawBody = req.body; // Buffer — express.raw() is mounted for /api/webhooks in index.js
  const signature = req.headers['X-Apify-Signature'] || req.headers['x-apify-signature'] || '';

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let data;
  try {
    data = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const datasetId = data?.resource?.defaultDatasetId;
  if (!datasetId) {
    return res.status(400).json({ error: 'Missing defaultDatasetId in payload' });
  }

  console.log(`[webhook] Received Apify webhook, dataset: ${datasetId}`);
  await processDataset(datasetId);
  res.json({ status: 'accepted' });
});

export default router;
