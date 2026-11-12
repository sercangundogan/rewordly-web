import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from './supabase';

/**
 * Admin dashboard access (pages/admin.tsx, pages/api/admin/*).
 * Only signed-in accounts whose email is in ADMIN_EMAILS (comma separated) get data. Everyone else gets
 * a plain 404, so the endpoints look like they do not exist.
 */

/** Prices shown on the dashboard page (pages/dashboard.tsx), used for MRR. */
export const PLAN_PRICES_USD = { monthly: 4.99, yearly: 49 } as const;

export function adminEmails(raw: string | undefined = process.env.ADMIN_EMAILS): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@')),
  );
}

export function isAdminEmail(email: string | null | undefined, raw?: string): boolean {
  if (!email) return false;
  return adminEmails(raw).has(email.trim().toLowerCase());
}

/** Headers for every admin response: never cached, never indexed. */
export function setAdminHeaders(res: NextApiResponse): void {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
}

export function notFound(res: NextApiResponse): void {
  res.status(404).json({ error: 'Not found' });
}

/**
 * Returns the admin's email, or sends a 404 and returns null.
 * Needs `Authorization: Bearer <Supabase access token>` from a signed-in admin account.
 */
export async function requireAdmin(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  setAdminHeaders(res);
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token || adminEmails().size === 0) {
    notFound(res);
    return null;
  }
  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    const email = data?.user?.email;
    if (error || !isAdminEmail(email)) {
      notFound(res);
      return null;
    }
    return email!;
  } catch {
    notFound(res);
    return null;
  }
}

export interface SubscriptionRow {
  plan: string | null;
  status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
}

export interface Revenue {
  /** Accounts with Pro access now (same rule as lib/auth.ts). */
  pro: number;
  monthly: number;
  yearly: number;
  /** Pro now, but will not renew. */
  cancelling: number;
  /** Monthly recurring revenue in USD; yearly plans count as a twelfth. Excludes plans that will not renew. */
  mrr: number;
  /** MRR including plans that will not renew (what is being paid today). */
  mrrGross: number;
}

export function computeRevenue(subs: SubscriptionRow[], now = Date.now()): Revenue {
  const out: Revenue = { pro: 0, monthly: 0, yearly: 0, cancelling: 0, mrr: 0, mrrGross: 0 };
  for (const s of subs) {
    const periodActive = s.current_period_end ? new Date(s.current_period_end).getTime() > now : false;
    const isPro = s.status === 'active' || (s.status === 'cancelled' && periodActive);
    if (!isPro) continue;
    out.pro++;
    const monthlyValue = s.plan === 'yearly' ? PLAN_PRICES_USD.yearly / 12 : PLAN_PRICES_USD.monthly;
    if (s.plan === 'yearly') out.yearly++;
    else out.monthly++;
    out.mrrGross += monthlyValue;
    const renews = s.status === 'active' && s.cancel_at_period_end !== true;
    if (renews) out.mrr += monthlyValue;
    else out.cancelling++;
  }
  out.mrr = Math.round(out.mrr * 100) / 100;
  out.mrrGross = Math.round(out.mrrGross * 100) / 100;
  return out;
}

/** The ?days= value the dashboard accepts. */
export function parseDays(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return [7, 14, 30, 90, 180, 365].includes(n) ? n : 30;
}
