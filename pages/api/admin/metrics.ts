import type { NextApiRequest, NextApiResponse } from 'next';
import { computeRevenue, parseDays, PLAN_PRICES_USD, requireAdmin, type SubscriptionRow } from '../../../lib/admin';
import { getSupabaseAdmin } from '../../../lib/supabase';

/** GET /api/admin/metrics?days=30 — everything the admin dashboard shows (supabase-admin.sql). Admins only. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  if (!(await requireAdmin(req, res))) return;

  const days = parseDays(req.query.days);
  const { data, error } = await getSupabaseAdmin().rpc('admin_dashboard', { p_days: days });
  if (error || !data) {
    console.error('admin_dashboard failed (has supabase-admin.sql been run?):', error?.message);
    res.status(500).json({ error: 'admin_dashboard failed. Has supabase-admin.sql been run in Supabase?' });
    return;
  }
  const subs = ((data as { now?: { subscriptions?: SubscriptionRow[] } }).now?.subscriptions ?? []) as SubscriptionRow[];
  res.status(200).json({
    ...data,
    revenue: computeRevenue(subs),
    config: {
      liveCheckDailyBudgetUsd: Number(process.env.LIVE_CHECK_DAILY_BUDGET_USD ?? 20),
      legacyDailyBudgetUsd: Number(process.env.LEGACY_DAILY_BUDGET_USD ?? 2),
      prices: PLAN_PRICES_USD,
    },
  });
}
