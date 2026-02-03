import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client for browser (login page, dashboard).
 * Use only in client-side code (pages/components).
 */
export function createSupabaseBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('createSupabaseBrowser must be used in the browser');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}
