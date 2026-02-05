import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '../lib/supabase-browser';
import type { Session } from '@supabase/supabase-js';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

type UsageData = {
  rewriteUsed?: number;
  rewriteLimit?: number | null;
  grammarUsed?: number;
  grammarLimit?: number | null;
  isSubscribed?: boolean;
};

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
      aria-hidden
    />
  );
}

const Dashboard: NextPage = () => {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

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

  useEffect(() => {
    if (!session?.access_token) return;
    setUsageLoading(true);
    const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    fetch(`${base}/api/usage`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setUsage(data))
      .catch(() => setUsage({}))
      .finally(() => setUsageLoading(false));
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || typeof window === 'undefined') return;
    const base = API_BASE || window.location.origin;
    fetch(`${base}/api/auth/create-connection-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ access_token: session.access_token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.code) {
          window.postMessage({ type: 'REWORDLY_CONNECT', token: data.code }, window.location.origin);
        }
      })
      .catch(() => {});
  }, [session?.access_token]);

  const startUpgrade = async () => {
    if (!session?.access_token) return;
    setUpgradeLoading(true);
    try {
      const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${base}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Checkout failed');
      if (data.url) window.open(data.url, '_blank');
    } catch {
      // ignore
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleLogout = () => {
    setLogoutLoading(true);
    router.replace('/logout');
  };

  const isCheckingAuth = session === undefined;
  const isPro = usage?.isSubscribed === true;
  const rewriteUsed = usage?.rewriteUsed ?? 0;
  const rewriteLimit = usage?.rewriteLimit ?? null;
  const grammarUsed = usage?.grammarUsed ?? 0;
  const grammarLimit = usage?.grammarLimit ?? null;
  const formatLimit = (used: number, limit: number | null) =>
    limit === null ? 'Unlimited' : `${used} / ${limit}`;

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

  return (
    <>
      <Head>
        <title>Dashboard – Rewordly</title>
        <meta name="description" content="Your account info and usage limits." />
      </Head>
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1a1a1a] text-white py-8 px-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg font-semibold">
                {session.user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-center">My account</h1>
            <p className="text-sm opacity-90 mt-1 text-center truncate px-2">
              {session.user?.email ?? ''}
            </p>
          </div>
          <div className="p-6">
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
                  {!isPro && (
                    <Skeleton className="h-3 w-full mt-2" />
                  )}
                </div>
              ) : (
                <>
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
                  {!isPro && (
                    <p className="text-xs text-gray-500 mt-3">
                      Payment plans coming soon. Until then, you can get unlimited daily use—or email sercangundogan35@gmail.com to request free limits.
                    </p>
                  )}
                </>
              )}
            </div>

            {!usageLoading && !isPro && (
              <p className="text-sm text-gray-500 mb-2">
                Payment plans coming soon. For free additional limits until then, email{' '}
                <a href="mailto:sercangundogan35@gmail.com" className="text-[#2d4a3e] font-medium hover:underline">
                  sercangundogan35@gmail.com
                </a>
                .
              </p>
            )}

            {usageLoading && !usage?.isSubscribed && (
              <Skeleton className="h-4 w-full rounded mb-2" />
            )}

            <div className="mt-6 flex flex-col items-center gap-2">
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
