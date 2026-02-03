import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '../../lib/supabase-browser';

const AuthCallback: NextPage = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setStatus('error');
        return;
      }
      if (session) {
        setStatus('ok');
        router.replace('/dashboard');
      } else {
        setStatus('error');
      }
    });
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1a1a1a] text-white py-8 px-6">
            <div className="h-8 w-32 mx-auto animate-pulse rounded-lg bg-white/20" />
            <div className="h-4 w-48 mx-auto mt-2 animate-pulse rounded-lg bg-white/20" />
          </div>
          <div className="p-6 space-y-3">
            <div className="h-4 w-full animate-pulse rounded-lg bg-gray-200" />
            <div className="h-4 w-48 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Sign-in could not be completed.</p>
          <a href="/login" className="text-[#1a1a1a] font-medium underline">Back to login</a>
        </div>
      </div>
    );
  }
  return null;
};

export default AuthCallback;
