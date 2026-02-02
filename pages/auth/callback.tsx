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
        router.replace('/connect-extension');
      } else {
        setStatus('error');
      }
    });
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <p className="text-gray-600">Completing sign in...</p>
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
