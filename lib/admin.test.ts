import { describe, expect, it } from 'vitest';
import { adminEmails, computeRevenue, isAdminEmail, parseDays } from './admin';
import { niceScale } from './chart-scale';

describe('admin access', () => {
  it('reads a comma separated, case-insensitive allowlist', () => {
    expect(Array.from(adminEmails(' A@x.com, b@y.com ,,nope '))).toEqual(['a@x.com', 'b@y.com']);
    expect(isAdminEmail('a@X.com', 'a@x.com,b@y.com')).toBe(true);
    expect(isAdminEmail('c@x.com', 'a@x.com')).toBe(false);
  });

  it('lets nobody in when the allowlist is empty or the email is missing', () => {
    expect(isAdminEmail('a@x.com', '')).toBe(false);
    expect(isAdminEmail('a@x.com', undefined)).toBe(false);
    expect(isAdminEmail(undefined, 'a@x.com')).toBe(false);
    expect(isAdminEmail('', 'a@x.com')).toBe(false);
  });
});

describe('computeRevenue', () => {
  const now = Date.parse('2026-11-12T00:00:00Z');
  const future = '2026-12-01T00:00:00Z';
  const past = '2026-11-01T00:00:00Z';

  it('counts renewing plans in MRR and cancelling ones only in the gross figure', () => {
    const r = computeRevenue(
      [
        { plan: 'monthly', status: 'active', cancel_at_period_end: false, current_period_end: future },
        { plan: 'yearly', status: 'active', cancel_at_period_end: false, current_period_end: future },
        { plan: 'yearly', status: 'active', cancel_at_period_end: true, current_period_end: future },
        { plan: 'monthly', status: 'cancelled', cancel_at_period_end: false, current_period_end: future },
        { plan: 'monthly', status: 'cancelled', cancel_at_period_end: false, current_period_end: past },
        { plan: 'monthly', status: 'inactive', cancel_at_period_end: false, current_period_end: null },
      ],
      now,
    );
    expect(r).toEqual({ pro: 4, monthly: 2, yearly: 2, cancelling: 2, mrr: 9.07, mrrGross: 18.15 });
  });
});

describe('parseDays', () => {
  it('accepts only the ranges the page offers', () => {
    expect(parseDays('7')).toBe(7);
    expect(parseDays(['90'])).toBe(90);
    expect(parseDays('1000')).toBe(30);
    expect(parseDays(undefined)).toBe(30);
  });
});


describe('niceScale', () => {
  it('picks clean axis steps', () => {
    expect(niceScale(47)).toEqual({ max: 50, step: 10 });
    expect(niceScale(3)).toEqual({ max: 3, step: 1 });
    expect(niceScale(0)).toEqual({ max: 4, step: 1 });
    expect(niceScale(1000)).toEqual({ max: 1000, step: 200 });
    expect(niceScale(0.16, false)).toEqual({ max: 0.2, step: 0.05 });
  });
});
