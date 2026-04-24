import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const VALID_SORT = {
  posted_date: 'posted_date',
  title: 'title',
  company_name: 'company_name',
};

// GET /api/scraped-jobs/viewed — declared before /:id to avoid param capture
router.get('/viewed', async (req, res) => {
  const { data, error } = await supabase
    .from('user_viewed_scraped_jobs')
    .select('job_id')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ job_ids: (data || []).map((r) => r.job_id) });
});

// POST /api/scraped-jobs/:id/viewed
router.post('/:id/viewed', async (req, res) => {
  const jobId = Number(req.params.id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const { error } = await supabase
    .from('user_viewed_scraped_jobs')
    .upsert({ user_id: req.user.id, job_id: jobId }, { onConflict: 'user_id,job_id' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ status: 'ok' });
});

// GET /api/scraped-jobs
router.get('/', async (req, res) => {
  const {
    title, company, location, work_type, experience, posted_date,
    sort_by = 'posted_date', order = 'desc',
  } = req.query;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.page_size, 10) || 50, 1), 200);
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  const sortColumn = VALID_SORT[sort_by] || 'posted_date';
  const ascending = order === 'asc';

  let query = supabase
    .from('scraped_jobs')
    .select(
      'id, external_id, title, company_name, location, job_url, posted_date, salary_min, salary_max, experience, work_type, remote_location, employment_type, ai_core_responsibilities, ai_requirements_summary, is_active, created_at',
      { count: 'exact' }
    )
    .eq('is_active', true)
    .order(sortColumn, { ascending })
    .range(fromIdx, toIdx);

  if (title) query = query.ilike('title', `%${title}%`);
  if (company) query = query.ilike('company_name', `%${company}%`);
  if (location) query = query.ilike('location', `%${location}%`);
  if (work_type) query = query.ilike('work_type', `%${work_type}%`);
  if (experience) query = query.ilike('experience', `%${experience}%`);
  if (posted_date) {
    const start = new Date(posted_date);
    const end = new Date(posted_date);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.gte('posted_date', start.toISOString()).lt('posted_date', end.toISOString());
  }

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const total = count || 0;
  res.json({
    items: data || [],
    total,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

// GET /api/scraped-jobs/:id
router.get('/:id', async (req, res) => {
  const jobId = Number(req.params.id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  const { data, error } = await supabase
    .from('scraped_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Job not found' });
  res.json(data);
});

export default router;
