import { Router } from 'express';
import supabase, { fetchAllBatched } from '../lib/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/applications', async (req, res) => {
  const { search, platform, job_type, work_type, from, to, user_id } = req.query;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(req.query.page_size, 10) || 10, 1), 100);
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let query = supabase
    .from('job_applications')
    .select('*', { count: 'exact' })
    .order('applied_at', { ascending: false })
    .range(fromIdx, toIdx);

  if (user_id) query = query.eq('user_id', user_id);
  if (platform) query = query.eq('platform', platform);
  if (job_type) query = query.eq('job_type', job_type);
  if (work_type) query = query.eq('work_type', work_type);
  if (from) query = query.gte('applied_at', from);
  if (to) query = query.lte('applied_at', to);
  if (search) {
    query = query.or(
      `job_title.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  const { data: applications, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Attach profile names
  const userIds = [...new Set(applications.map((a) => a.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', userIds);

  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.name]));

  const items = applications.map((a) => ({ ...a, user_name: profileMap[a.user_id] || null }));
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  res.json({
    items,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages
  });
});

router.get('/users', async (req, res) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  let counts;
  try {
    counts = await fetchAllBatched(({ from, to }) =>
      supabase.from('job_applications').select('user_id').range(from, to)
    );
  } catch {
    counts = [];
  }

  const countMap = {};
  for (const row of counts) {
    countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
  }

  res.json(profiles.map((u) => ({ ...u, application_count: countMap[u.id] || 0 })));
});

export default router;
