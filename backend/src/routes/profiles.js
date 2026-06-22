import { Router } from 'express';
import supabase from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: req.user.id, name: String(name).trim() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ name: String(name).trim() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const profileId = req.params.id;
  const userId = req.user.id;
  const deleteApplications = req.query.delete_applications === 'true';

  if (deleteApplications) {
    const { error: appsError } = await supabase
      .from('job_applications')
      .delete()
      .eq('profile_id', profileId)
      .eq('user_id', userId);
    if (appsError) return res.status(500).json({ error: appsError.message });
  } else {
    // Before the cascade sets profile_id to NULL, remove applications that would
    // conflict with an existing NULL-profile row on (user_id, url, job_title, company).
    const { data: profileApps, error: fetchError } = await supabase
      .from('job_applications')
      .select('id, url, job_title, company')
      .eq('profile_id', profileId)
      .eq('user_id', userId);
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    for (const app of (profileApps || [])) {
      const { data: conflict } = await supabase
        .from('job_applications')
        .select('id')
        .eq('user_id', userId)
        .eq('url', app.url)
        .eq('job_title', app.job_title)
        .eq('company', app.company)
        .is('profile_id', null)
        .maybeSingle();

      if (conflict) {
        const { error: delError } = await supabase
          .from('job_applications')
          .delete()
          .eq('id', app.id);
        if (delError) return res.status(500).json({ error: delError.message });
      }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
