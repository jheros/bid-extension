import { Router } from 'express';
import supabase, { fetchAllBatched } from '../lib/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getBangkokDayRange, getBangkokWeekRange, getBangkokMonthRange } from '../lib/dateUtils.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/applications', async (req, res) => {
  const { search, platform, job_type, work_type, from, to, user_id, profile_id } = req.query;
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
  if (profile_id) query = query.eq('profile_id', profile_id);
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

  // Attach user names
  const userIds = [...new Set(applications.map((a) => a.user_id))];
  const { data: userRows } = userIds.length
    ? await supabase.from('users').select('id, name').in('id', userIds)
    : { data: [] };
  const userNameMap = Object.fromEntries((userRows || []).map((u) => [u.id, u.name]));

  // Attach profile names
  const profileIds = [...new Set(applications.map((a) => a.profile_id).filter(Boolean))];
  const { data: profileRows } = profileIds.length
    ? await supabase.from('profiles').select('id, name').in('id', profileIds)
    : { data: [] };
  const profileNameMap = Object.fromEntries((profileRows || []).map((p) => [p.id, p.name]));

  const items = applications.map((a) => ({
    ...a,
    user_name: userNameMap[a.user_id] || null,
    profile_name: a.profile_id ? (profileNameMap[a.profile_id] || null) : null,
  }));
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
  const { data: userRows, error } = await supabase
    .from('users')
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

  let dailyMap = {};
  let weeklyMap = {};
  let monthlyMap = {};
  const dateStr = req.query.date;
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const dayRange = getBangkokDayRange(dateStr);
    const weekRange = getBangkokWeekRange(dateStr);
    const monthRange = getBangkokMonthRange(dateStr);
    let appsInRange;
    try {
      appsInRange = await fetchAllBatched(({ from, to }) =>
        supabase
          .from('job_applications')
          .select('user_id, applied_at')
          .gte('applied_at', monthRange.from)
          .lte('applied_at', monthRange.to)
          .range(from, to)
      );
    } catch {
      appsInRange = [];
    }
    const dayFrom = new Date(dayRange.from).getTime();
    const dayTo = new Date(dayRange.to).getTime();
    const weekFrom = new Date(weekRange.from).getTime();
    const weekTo = new Date(weekRange.to).getTime();
    const monthFrom = new Date(monthRange.from).getTime();
    const monthTo = new Date(monthRange.to).getTime();
    for (const row of appsInRange) {
      const uid = row.user_id;
      const ts = new Date(row.applied_at).getTime();
      if (ts >= dayFrom && ts <= dayTo) dailyMap[uid] = (dailyMap[uid] || 0) + 1;
      if (ts >= weekFrom && ts <= weekTo) weeklyMap[uid] = (weeklyMap[uid] || 0) + 1;
      if (ts >= monthFrom && ts <= monthTo) monthlyMap[uid] = (monthlyMap[uid] || 0) + 1;
    }
  }

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, user_id');
  const userGroupIds = {};
  for (const m of memberships || []) {
    userGroupIds[m.user_id] = userGroupIds[m.user_id] || [];
    userGroupIds[m.user_id].push(m.group_id);
  }
  const groupIds = [...new Set((memberships || []).map((m) => m.group_id))];
  const { data: groups } = groupIds.length
    ? await supabase.from('groups').select('id, name').in('id', groupIds)
    : { data: [] };
  const groupMap = Object.fromEntries((groups || []).map((g) => [g.id, g]));

  // Fetch all profiles grouped by user
  const allUserIds = userRows.map((u) => u.id);
  const { data: allProfiles } = allUserIds.length
    ? await supabase
        .from('profiles')
        .select('id, user_id, name, created_at')
        .in('user_id', allUserIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  const profilesByUser = {};
  for (const p of allProfiles || []) {
    profilesByUser[p.user_id] = profilesByUser[p.user_id] || [];
    profilesByUser[p.user_id].push({ id: p.id, name: p.name, created_at: p.created_at });
  }

  res.json(userRows.map((u) => ({
    ...u,
    application_count: countMap[u.id] || 0,
    daily_count: dailyMap[u.id] ?? null,
    weekly_count: weeklyMap[u.id] ?? null,
    monthly_count: monthlyMap[u.id] ?? null,
    group_ids: userGroupIds[u.id] || [],
    groups: (userGroupIds[u.id] || []).map((gid) => ({ id: gid, name: groupMap[gid]?.name })),
    profiles: profilesByUser[u.id] || [],
  })));
});

router.get('/groups', async (req, res) => {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, created_at')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });

  const { data: members } = await supabase
    .from('group_members')
    .select('group_id, user_id');
  const membersByGroup = {};
  for (const m of members || []) {
    membersByGroup[m.group_id] = membersByGroup[m.group_id] || [];
    membersByGroup[m.group_id].push(m.user_id);
  }
  const userIds = [...new Set((members || []).map((m) => m.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from('users').select('id, name').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  res.json((data || []).map((g) => ({
    ...g,
    member_ids: membersByGroup[g.id] || [],
    members: (membersByGroup[g.id] || []).map((uid) => ({ id: uid, name: profileMap[uid]?.name }))
  })));
});

router.post('/groups', async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: String(name).trim() })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/groups/:id', async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const { data, error } = await supabase
    .from('groups')
    .update({ name: String(name).trim() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/groups/:id', async (req, res) => {
  const { error } = await supabase.from('groups').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

router.post('/groups/:id/members', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: req.params.id, user_id });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ group_id: req.params.id, user_id });
});

router.delete('/groups/:id/members/:userId', async (req, res) => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', req.params.id)
    .eq('user_id', req.params.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
