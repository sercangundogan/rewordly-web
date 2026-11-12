import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, rpc } = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseAdmin: () => ({ auth: { getUser }, rpc }) }));

import metrics from '../../pages/api/admin/metrics';
import user from '../../pages/api/admin/user';

function call(handler: typeof metrics, query: Record<string, string>, authorization?: string) {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  const req = { method: 'GET', query, headers: authorization ? { authorization } : {} };
  return handler(req as never, res as never).then(() => res);
}

describe('admin API', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'boss@x.com';
    getUser.mockReset();
    rpc.mockReset();
  });

  it('answers 404 without a token and never queries data', async () => {
    const res = await call(metrics, {});
    expect(res.statusCode).toBe(404);
    expect(res.headers['X-Robots-Tag']).toContain('noindex');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('answers 404 to a signed-in account that is not on the list', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'someone@x.com' } }, error: null });
    const res = await call(metrics, {}, 'Bearer t');
    expect(res.statusCode).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('answers 404 to everyone when ADMIN_EMAILS is not set', async () => {
    delete process.env.ADMIN_EMAILS;
    getUser.mockResolvedValue({ data: { user: { email: 'boss@x.com' } }, error: null });
    const res = await call(metrics, {}, 'Bearer t');
    expect(res.statusCode).toBe(404);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('answers 404 when the token is invalid', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });
    expect((await call(metrics, {}, 'Bearer t')).statusCode).toBe(404);
  });

  it('returns the dashboard with revenue to an admin', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'Boss@x.com' } }, error: null });
    rpc.mockResolvedValue({
      data: { days: 7, now: { subscriptions: [{ plan: 'monthly', status: 'active', cancel_at_period_end: false, current_period_end: null }] } },
      error: null,
    });
    const res = await call(metrics, { days: '7' }, 'Bearer t');
    expect(res.statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith('admin_dashboard', { p_days: 7 });
    expect((res.body as { revenue: { mrr: number } }).revenue.mrr).toBe(4.99);
    expect(res.headers['Cache-Control']).toContain('no-store');
  });

  it('looks up one user for an admin', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'boss@x.com' } }, error: null });
    rpc.mockResolvedValue({ data: { identity: 'anon:a' }, error: null });
    const res = await call(user, { q: ' anon:a ' }, 'Bearer t');
    expect(rpc).toHaveBeenCalledWith('admin_user', { p_query: 'anon:a' });
    expect(res.body).toEqual({ user: { identity: 'anon:a' } });
  });
});
