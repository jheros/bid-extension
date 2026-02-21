import { Router } from 'express';
import supabase from '../lib/supabase.js';

const router = Router();

router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true});

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, name });

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  res.status(201).json({
    message: 'Account created. You can now sign in.',
    user: { id: data.user.id, email: data.user.email }
  });
});

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email }
  });
});

router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error || !data.session || !data.user) {
    return res.status(401).json({ error: error?.message || 'Invalid refresh token' });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email }
  });
});

export default router;
