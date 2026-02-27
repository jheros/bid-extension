import { Router } from 'express';
import supabase, { fetchAllBatched } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { search, platform, job_type, work_type, from, to } = req.query;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(req.query.page_size, 10) || 10, 1), 100);
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let query = supabase
    .from('job_applications')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('applied_at', { ascending: false })
    .range(fromIdx, toIdx);

  if (search) {
    query = query.or(
      `job_title.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`
    );
  }
  if (platform) query = query.eq('platform', platform);
  if (job_type) query = query.eq('job_type', job_type);
  if (work_type) query = query.eq('work_type', work_type);
  if (from) query = query.gte('applied_at', from);
  if (to) query = query.lte('applied_at', to);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  res.json({
    items: data || [],
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages
  });
});

router.get('/stats', async (req, res) => {
  const now = new Date();

  // Bangkok timezone cutoff: 08:00 UTC+7 = 01:00 UTC
  const dayBoundaryHour = 1;
  const shiftedNow = new Date(now - dayBoundaryHour * 60 * 60 * 1000);
  const y = shiftedNow.getUTCFullYear();
  const m = shiftedNow.getUTCMonth();
  const d = shiftedNow.getUTCDate();
  const dow = shiftedNow.getUTCDay();

  const dayStart = new Date(Date.UTC(y, m, d, dayBoundaryHour, 0, 0));
  const mondayOffset = (dow + 6) % 7;
  const weekStart = new Date(dayStart - mondayOffset * 86400000);
  const monthStart = new Date(Date.UTC(y, m, 1, dayBoundaryHour, 0, 0));

  let data;
  try {
    data = await fetchAllBatched(({ from, to }) =>
      supabase
        .from('job_applications')
        .select('applied_at, platform')
        .eq('user_id', req.user.id)
        .range(from, to)
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const bucket = () => ({ total: 0, byPlatform: {} });
  const add = (b, platform) => {
    b.total++;
    b.byPlatform[platform] = (b.byPlatform[platform] || 0) + 1;
  };

  const day = bucket();
  const week = bucket();
  const month = bucket();

  for (const row of data) {
    const ts = new Date(row.applied_at);
    const p = row.platform || 'other';
    if (ts >= monthStart) add(month, p);
    if (ts >= weekStart) add(week, p);
    if (ts >= dayStart) add(day, p);
  }

  res.json({ day, week, month });
});

router.post('/', async (req, res) => {
  const {
    job_title, company, location, work_type, job_type,
    salary, security_clearance, resume, url, platform, applied_at
  } = req.body;

  if (!job_title || !company || !url) {
    return res.status(400).json({ error: 'job_title, company, and url are required' });
  }

  // Duplicate check
  const { data: existing } = await supabase
    .from('job_applications')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('url', url)
    .eq('job_title', job_title)
    .eq('company', company)
    .limit(1);

  if (existing?.length > 0) {
    return res.status(409).json({ error: 'DUPLICATE_APPLICATION' });
  }
  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      user_id: req.user.id,
      job_title,
      company,
      location: location || null,
      work_type: work_type || null,
      job_type: job_type || null,
      salary: salary || null,
      security_clearance: security_clearance || null,
      resume: resume || null,
      url,
      platform: platform || 'other',
      applied_at: applied_at || new Date().toISOString()
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('job_applications')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
