import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowser } from '../lib/supabase-browser';
import type { Session } from '@supabase/supabase-js';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

type SubscriptionData = {
  plan?: 'monthly' | 'yearly' | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

type UsageData = {
  rewriteUsed?: number;
  rewriteLimit?: number | null;
  grammarUsed?: number;
  grammarLimit?: number | null;
  isSubscribed?: boolean;
  subscription?: SubscriptionData;
};

type Plan = 'monthly' | 'yearly';

const PRICES: Record<Plan, { amount: string; period: string; note?: string }> = {
  monthly: { amount: '$4.99', period: '/month' },
  yearly: { amount: '$49', period: '/year', note: '2 months free' },
};

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
      aria-hidden
    />
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const Dashboard: NextPage = () => {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  // 'polling' while waiting for the webhook after checkout, 'activated' once Pro is confirmed
  const [activation, setActivation] = useState<'idle' | 'polling' | 'activated' | 'delayed'>('idle');
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) {
        router.replace('/login');
        return;
      }
      setSession(s);
    });
  }, [router]);

  const fetchUsage = useCallback(async (): Promise<UsageData | null> => {
    if (!session?.access_token) return null;
    const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    try {
      const r = await fetch(`${base}/api/usage`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      return await r.json();
    } catch {
      return null;
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    setUsageLoading(true);
    fetchUsage()
      .then((data) => setUsage(data ?? {}))
      .finally(() => setUsageLoading(false));
  }, [session?.access_token, fetchUsage]);

  useEffect(() => {
    if (!session?.access_token || typeof window === 'undefined') return;
    const base = API_BASE || window.location.origin;
    fetch(`${base}/api/auth/create-connection-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        access_token:     session.access_token,
        refresh_token:    session.refresh_token ?? undefined,
        token_expires_at: session.expires_at
          ? Math.floor(new Date(session.expires_at).getTime() / 1000)
          : undefined,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.code) {
          window.postMessage({ type: 'REWORDLY_CONNECT', token: data.code }, window.location.origin);
        }
      })
      .catch(() => {});
  }, [session?.access_token]);

  // After returning from Dodo checkout, poll until the webhook flips the user to Pro.
  useEffect(() => {
    if (!router.isReady || !session?.access_token) return;
    if (router.query.checkout !== 'success') return;

    setActivation('polling');
    const startedAt = Date.now();
    const MAX_WAIT_MS = 90_000;

    const poll = async () => {
      const data = await fetchUsage();
      if (data?.isSubscribed) {
        setUsage(data);
        setActivation('activated');
        router.replace('/dashboard', undefined, { shallow: true });
        return;
      }
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        setActivation('delayed');
        router.replace('/dashboard', undefined, { shallow: true });
        return;
      }
      pollTimer.current = setTimeout(poll, 2500);
    };

    poll();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.checkout, session?.access_token]);

  const startUpgrade = async (plan: Plan) => {
    if (!session?.access_token || upgradeLoading) return;
    setUpgradeLoading(true);
    setUpgradeError(null);
    try {
      const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || 'Checkout failed');
      window.location.href = data.url;
    } catch {
      setUpgradeError('Could not start checkout. Please try again.');
      setUpgradeLoading(false);
    }
  };

  const openBillingPortal = async () => {
    if (!session?.access_token || portalLoading) return;
    setPortalLoading(true);
    try {
      const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error('Portal failed');
      window.location.href = data.url;
    } catch {
      setPortalLoading(false);
    }
  };

  const handleLogout = () => {
    setLogoutLoading(true);
    router.replace('/logout');
  };

  const isCheckingAuth = session === undefined;
  const isPro = usage?.isSubscribed === true;
  const sub = usage?.subscription;
  const rewriteUsed = usage?.rewriteUsed ?? 0;
  const rewriteLimit = usage?.rewriteLimit ?? null;
  const grammarUsed = usage?.grammarUsed ?? 0;
  const grammarLimit = usage?.grammarLimit ?? null;
  const formatLimit = (used: number, limit: number | null) =>
    limit === null ? 'Unlimited' : `${used} / ${limit}`;
  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  if (isCheckingAuth) {
    return (
      <>
        <Head>
          <title>Dashboard – Rewordly</title>
        </Head>
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-[#1a1a1a] text-white py-8 px-6">
              <Skeleton className="h-12 w-12 mx-auto mb-3 rounded-full" />
              <Skeleton className="h-7 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto mt-2" />
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-gray-200 p-4 mb-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-xl mb-6" />
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!session) {
    return null;
  }

  const showActivationOverlay = activation === 'polling';

  return (
    <>
      <Head>
        <title>Dashboard – Rewordly</title>
        <meta name="description" content="Your account info and usage limits." />
      </Head>
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1a1a1a] text-white py-8 px-6 relative">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-semibold">
                {session.user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-center">My account</h1>
            <p className="text-sm opacity-90 mt-1 text-center truncate px-2">
              {session.user?.email ?? ''}
            </p>
            {isPro && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-white text-[#0a0a0a] px-3 py-1 text-xs font-bold tracking-wide">
                <CheckIcon className="w-3 h-3" />
                PRO
              </span>
            )}
          </div>
          <div className="p-6">
            {/* Checkout return: activating Pro */}
            {showActivationOverlay && (
              <div className="rounded-xl border border-gray-200 bg-[#fafafa] p-6 mb-6 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-gray-300 border-t-[#0a0a0a] animate-spin" />
                <h2 className="text-sm font-bold text-gray-900">Payment received</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Activating your Pro plan — this usually takes a few seconds…
                </p>
              </div>
            )}

            {activation === 'activated' && (
              <div className="rounded-xl border border-gray-900 bg-[#0a0a0a] text-white p-5 mb-6 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white text-[#0a0a0a] flex items-center justify-center">
                  <CheckIcon className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold">Welcome to Rewordly Pro</h2>
                <p className="text-xs opacity-80 mt-1">
                  Daily limits are gone. Enjoy unlimited rewrites and grammar checks.
                </p>
              </div>
            )}

            {activation === 'delayed' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
                <p className="text-xs text-amber-800">
                  Your payment was received, but activation is taking longer than usual.
                  It will complete automatically — refresh this page in a minute. If Pro
                  doesn&apos;t appear, contact{' '}
                  <a href="mailto:sercangundogan35@gmail.com" className="font-medium underline">
                    support
                  </a>
                  .
                </p>
              </div>
            )}

            {/* Daily limits */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">Daily limits</h2>
              {usageLoading ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Rewrite</span>
                    <span className="font-medium text-gray-800">
                      {formatLimit(rewriteUsed, rewriteLimit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grammar check</span>
                    <span className="font-medium text-gray-800">
                      {formatLimit(grammarUsed, grammarLimit)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pro subscriber: plan + billing management */}
            {!usageLoading && isPro && (
              <div className="rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-800">Your plan</h2>
                  <span className="text-sm font-bold text-gray-900">
                    Pro {sub?.plan === 'yearly' ? 'Yearly' : sub?.plan === 'monthly' ? 'Monthly' : ''}
                  </span>
                </div>
                {sub?.currentPeriodEnd && (
                  <p className="text-xs text-gray-500 mb-3">
                    {sub.cancelAtPeriodEnd
                      ? `Pro access ends on ${formatDate(sub.currentPeriodEnd)}`
                      : `Renews on ${formatDate(sub.currentPeriodEnd)}`}
                  </p>
                )}
                <button
                  type="button"
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="w-full rounded-xl border-2 border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900 disabled:opacity-50"
                >
                  {portalLoading ? 'Opening billing portal…' : 'Manage billing'}
                </button>
              </div>
            )}

            {/* Free user: upgrade card */}
            {!usageLoading && !isPro && activation !== 'polling' && (
              <div className="rounded-2xl border border-gray-900 overflow-hidden mb-6">
                <div className="bg-[#0a0a0a] px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">Upgrade to Pro</h2>
                    {/* Plan toggle */}
                    <div className="flex rounded-full bg-white/10 p-0.5" role="tablist" aria-label="Billing period">
                      {(['monthly', 'yearly'] as Plan[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          role="tab"
                          aria-selected={selectedPlan === p}
                          onClick={() => setSelectedPlan(p)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                            selectedPlan === p
                              ? 'bg-white text-[#0a0a0a]'
                              : 'text-white/70 hover:text-white'
                          }`}
                        >
                          {p === 'monthly' ? 'Monthly' : 'Yearly'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-white">
                      {PRICES[selectedPlan].amount}
                    </span>
                    <span className="text-sm text-white/60">{PRICES[selectedPlan].period}</span>
                    {PRICES[selectedPlan].note && (
                      <span className="ml-auto rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {PRICES[selectedPlan].note}
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <ul className="space-y-2 mb-4">
                    {[
                      'Unlimited rewrites every day',
                      'Unlimited grammar checks',
                      'All writing tones included',
                      'Cancel anytime',
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0a0a0a] text-white">
                          <CheckIcon className="h-2.5 w-2.5" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => startUpgrade(selectedPlan)}
                    disabled={upgradeLoading}
                    className="w-full rounded-xl bg-[#0a0a0a] py-3 text-sm font-bold text-white transition-all hover:bg-[#262626] hover:shadow-lg disabled:opacity-60"
                  >
                    {upgradeLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Redirecting to checkout…
                      </span>
                    ) : (
                      `Upgrade to Pro — ${PRICES[selectedPlan].amount}${PRICES[selectedPlan].period}`
                    )}
                  </button>
                  {upgradeError && (
                    <p className="mt-2 text-center text-xs text-red-600">{upgradeError}</p>
                  )}
                  <p className="mt-2 text-center text-[11px] text-gray-400">
                    Secure checkout by Dodo Payments
                  </p>
                </div>
              </div>
            )}

            {usageLoading && (
              <Skeleton className="h-40 w-full rounded-2xl mb-6" />
            )}

            <div className="mt-2 flex flex-col items-center gap-2">
              <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
                Back to home
              </a>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {logoutLoading ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
