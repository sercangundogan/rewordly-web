import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '../lib/supabase-browser';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className}`} aria-hidden />;
}

const Login: NextPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
      setSessionChecking(false);
    });
  }, [router]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
      setMessage('We sent a 6-digit code to your email.');
      setStep('code');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      if (err) throw err;
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      // Use explicit production URL when set (avoids reverse proxy / wrong origin); else current origin
      const baseUrl =
        typeof window !== 'undefined'
          ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
          : process.env.NEXT_PUBLIC_APP_URL || '';
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${baseUrl.replace(/\/$/, '')}/auth/callback` },
      });
      if (err) throw err;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setLoading(false);
    }
  };

  const backToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setMessage('');
  };

  if (sessionChecking) {
    return (
      <>
        <Head>
          <title>Log in – Rewordly</title>
        </Head>
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-[#1a1a1a] text-white py-8 px-6 text-center">
              <Skeleton className="h-8 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto mt-2" />
            </div>
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Log in – Rewordly</title>
        <meta name="description" content="Log in to Rewordly for more daily uses and to sync with the extension." />
      </Head>
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#1a1a1a] text-white py-8 px-6 text-center">
            <h1 className="text-2xl font-bold">Rewordly</h1>
            <p className="text-sm opacity-90 mt-1">Log in for more daily uses</p>
            <p className="text-xs opacity-75 mt-1">Payment plans coming soon. Unlimited daily use will be available.</p>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}
            {message && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{message}</div>
            )}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-medium text-gray-800 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-2">
              <span className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-500">or</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>

            {step === 'email' ? (
              <form onSubmit={handleSendCode} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#1a1a1a] text-white font-medium hover:bg-[#2d2d2d] disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-3">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to <strong className="text-gray-800">{email}</strong>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#1a1a1a] focus:border-transparent outline-none text-center text-lg tracking-widest"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 px-4 rounded-xl bg-[#1a1a1a] text-white font-medium hover:bg-[#2d2d2d] disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify and log in'}
                </button>
                <button
                  type="button"
                  onClick={backToEmail}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Use a different email
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
