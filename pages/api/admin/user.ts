import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

/** GET /api/admin/user?q=<email | user:<uuid> | anon:<id> | uuid> — one person's data (supabase-admin.sql). Admins only. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!(await requireAdmin(req, res))) return;

  const q = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q ?? '').trim().slice(0, 200);
  if (!q) {
    res.status(400).json({ error: 'Missing q' });
    return;
  }
  const { data, error } = await getSupabaseAdmin().rpc('admin_user', { p_query: q });
  if (error) {
    console.error('admin_user failed (has supabase-admin.sql been run?):', error.message);
    res.status(500).json({ error: 'admin_user failed. Has supabase-admin.sql been run in Supabase?' });
    return;
  }
  res.status(200).json({ user: data ?? null });
}
