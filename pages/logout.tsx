import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '../lib/supabase-browser';

const Logout: NextPage = () => {
  const router = useRouter();
  const [message, setMessage] = useState('Signing out...');

  useEffect(() => {
    let cancelled = false;

    async function doLogout() {
      try {
        const supabase = createSupabaseBrowser();
        await supabase.auth.signOut();
      } catch {
        // Continue to redirect even if signOut fails (e.g. no session)
      }

      if (cancelled) return;

      // Tell extension content script (on this page) to clear extension session
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'REWORDLY_LOGOUT' }, window.location.origin);
      }

      setMessage('Redirecting...');
      router.replace('/');
    }

    doLogout();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <>
      <Head>
        <title>Sign out – Rewordly</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-700">{message}</p>
        </div>
      </div>
    </>
  );
};

export default Logout;
