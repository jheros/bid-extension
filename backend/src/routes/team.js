import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

async function getUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const users = await listAllAuthUsers();
  return users.find((u) => (u.email || '').toLowerCase() === normalized) || null;
}

async function getAuthUsersByIds(ids) {
  if (!ids.length) return {};
  const idSet = new Set(ids);
  const users = await listAllAuthUsers();
  return users
    .filter((u) => idSet.has(u.id))
    .reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});
}

function buildPeopleMap(profiles = [], authUsersById = {}) {
  const profileMap = profiles.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  return (id) => ({
    id,
    name: profileMap[id]?.name || null,
    email: authUsersById[id]?.email || null
  });
}

function formatRequestRow(row, meId, personById) {
  const requester = personById(row.requester_id);
  const receiver = personById(row.receiver_id);
  const counterpart = row.requester_id === meId ? receiver : requester;

  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    responded_at: row.responded_at,
    requester,
    receiver,
    counterpart
  };
}

async function getAcceptedTeammateIds(userId) {
  const { data, error } = await supabase
    .from('team_connections')
    .select('requester_id, receiver_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) throw error;

  return (data || []).map((row) => (row.requester_id === userId ? row.receiver_id : row.requester_id));
}

async function getGroupMemberIds(userId) {
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (error || !memberships?.length) return [];

  const groupIds = memberships.map((m) => m.group_id);
  const { data: members, error: memErr } = await supabase
    .from('group_members')
    .select('user_id')
    .in('group_id', groupIds)
    .neq('user_id', userId);

  if (memErr) return [];
  return [...new Set((members || []).map((m) => m.user_id))];
}

router.get('/requests', async (req, res) => {
  const meId = req.user.id;

  try {
    const { data: rows, error } = await supabase
      .from('team_connections')
      .select('*')
      .or(`requester_id.eq.${meId},receiver_id.eq.${meId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const userIds = [...new Set((rows || []).flatMap((r) => [r.requester_id, r.receiver_id]))];
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase.from('users').select('id, name').in('id', userIds)
      : { data: [], error: null };
    if (profilesError) return res.status(500).json({ error: profilesError.message });

    const authUsersById = await getAuthUsersByIds(userIds);
    const personById = buildPeopleMap(profiles || [], authUsersById);

    const formatted = (rows || []).map((row) => formatRequestRow(row, meId, personById));

    res.json({
      incoming: formatted.filter((r) => r.status === 'pending' && r.receiver.id === meId),
      outgoing: formatted.filter((r) => r.status === 'pending' && r.requester.id === meId),
      connections: formatted.filter((r) => r.status === 'accepted')
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/requests', async (req, res) => {
  const meId = req.user.id;
  const email = req.body?.email;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  let targetUser;
  try {
    targetUser = await getUserByEmail(email);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (targetUser.id === meId) {
    return res.status(400).json({ error: 'You cannot send a request to yourself' });
  }

  const pairFilter = `and(requester_id.eq.${meId},receiver_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},receiver_id.eq.${meId})`;
  const { data: existingRows, error: existingError } = await supabase
    .from('team_connections')
    .select('*')
    .or(pairFilter)
    .limit(1);

  if (existingError) return res.status(500).json({ error: existingError.message });

  const existing = existingRows?.[0];
  if (!existing) {
    const { data, error } = await supabase
      .from('team_connections')
      .insert({
        requester_id: meId,
        receiver_id: targetUser.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (existing.status === 'accepted') {
    return res.status(409).json({ error: 'You are already connected' });
  }

  if (existing.status === 'pending') {
    if (existing.requester_id === meId) {
      return res.status(409).json({ error: 'Request already sent' });
    }
    return res.status(409).json({ error: 'This user already requested access from you' });
  }

  // Re-open denied request by replacing direction with the new requester.
  const { data, error } = await supabase
    .from('team_connections')
    .update({
      requester_id: meId,
      receiver_id: targetUser.id,
      status: 'pending',
      created_at: new Date().toISOString(),
      responded_at: null
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/requests/:id', async (req, res) => {
  const meId = req.user.id;
  const { action } = req.body || {};

  if (!['accept', 'deny'].includes(action)) {
    return res.status(400).json({ error: 'action must be accept or deny' });
  }

  const { data: existing, error: existingError } = await supabase
    .from('team_connections')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (existingError) return res.status(404).json({ error: 'Request not found' });
  if (existing.receiver_id !== meId) {
    return res.status(403).json({ error: 'Only the receiver can respond to this request' });
  }
  if (existing.status !== 'pending') {
    return res.status(400).json({ error: 'Request is already resolved' });
  }

  const { data, error } = await supabase
    .from('team_connections')
    .update({
      status: action === 'accept' ? 'accepted' : 'denied',
      responded_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/teammates', async (req, res) => {
  const meId = req.user.id;

  try {
    const [teammateIds, groupMemberIds] = await Promise.all([
      getAcceptedTeammateIds(meId),
      getGroupMemberIds(meId)
    ]);
    const allIds = [...new Set([...teammateIds, ...groupMemberIds])];
    if (!allIds.length) return res.json([]);

    const { data: profiles, error: profilesError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', allIds);
    if (profilesError) return res.status(500).json({ error: profilesError.message });

    const authUsersById = await getAuthUsersByIds(allIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const teammates = allIds.map((id) => ({
      id,
      name: profileMap[id]?.name || null,
      email: authUsersById[id]?.email || null
    }));

    res.json(teammates);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/applications', async (req, res) => {
  const meId = req.user.id;
  const { user_id, search, platform, job_type, work_type, from, to } = req.query;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(req.query.page_size, 10) || 10, 1), 100);
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const [teammateIds, groupMemberIds] = await Promise.all([
      getAcceptedTeammateIds(meId),
      getGroupMemberIds(meId)
    ]);
    const allowedIds = new Set([meId, ...teammateIds, ...groupMemberIds]);

    if (!allowedIds.has(user_id)) {
      return res.status(403).json({ error: 'You do not have access to this user applications' });
    }

    let query = supabase
      .from('job_applications')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
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

    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user_id)
      .single();

    const items = (data || []).map((row) => ({
      ...row,
      owner_name: profile?.name || null,
      is_own: row.user_id === meId
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
