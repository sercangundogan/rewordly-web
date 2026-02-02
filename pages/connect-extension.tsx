import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '../lib/supabase-browser';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || '';

const ConnectExtension: NextPage = () => {
  const router = useRouter();
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) {
        router.replace('/login');
        return;
      }
      setSession({ access_token: s.access_token });
    });
  }, [router]);

  useEffect(() => {
    if (!session?.access_token) return;
    const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    fetch(`${base}/api/usage`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setIsSubscribed(Boolean(data?.isSubscribed)))
      .catch(() => setIsSubscribed(false));
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) return;
    const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
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
        if (data?.code && typeof window !== 'undefined') {
          window.postMessage({ type: 'REWORDLY_CONNECT', token: data.code }, window.location.origin);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
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
      setUpgradeLoading(false);
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Giriş başarılı – Rewordly</title>
      </Head>
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1a1a1a] text-white py-8 px-6 text-center">
            <h1 className="text-2xl font-bold">Rewordly</h1>
            <p className="text-sm opacity-90 mt-1">Giriş başarılı</p>
          </div>
          <div className="p-6">
            {!ready ? (
              <p className="text-gray-600 text-sm">Bağlanıyor...</p>
            ) : (
              <>
                <p className="text-gray-700 text-sm mb-4">
                  Başarıyla giriş yaptınız. Rewordly eklentisi yüklüyse otomatik olarak bu hesapla bağlanacaktır.
                </p>
                {isSubscribed === false && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={startUpgrade}
                      disabled={upgradeLoading}
                      className="w-full py-3 px-4 rounded-xl bg-[#2d4a3e] text-white font-medium hover:bg-[#1e3d32] disabled:opacity-50"
                    >
                      {upgradeLoading ? 'Açılıyor...' : `Pro'ya yükselt`}
                    </button>
                  </div>
                )}
                <p className="mt-6 text-center">
                  <a href="/" className="text-sm text-gray-500 hover:text-gray-700">Ana sayfaya dön</a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConnectExtension;
