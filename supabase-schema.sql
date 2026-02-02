-- Run this in Supabase SQL Editor to create tables for auth + payment.

-- Daily usage per identity (user id or anonymous id)
CREATE TABLE IF NOT EXISTS public.usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity TEXT NOT NULL,
  date DATE NOT NULL,
  rewrite_count INTEGER NOT NULL DEFAULT 0,
  grammar_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(identity, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_identity_date ON public.usage (identity, date);

-- Subscriptions from LemonSqueezy (linked to Supabase user_id)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemon_subscription_id TEXT,
  lemon_order_id TEXT,
  lemon_variant_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_id ON public.subscriptions (lemon_subscription_id);

-- RLS: allow service role full access; optional: allow users to read own subscription
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: only backend (service_role) can read/write usage and subscriptions
CREATE POLICY "Service role only usage" ON public.usage
  FOR ALL USING (false);

CREATE POLICY "Service role only subscriptions" ON public.subscriptions
  FOR ALL USING (false);

-- One-time codes to link website login to extension (code -> access_token, 5 min TTL)
CREATE TABLE IF NOT EXISTS public.connection_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connection_codes_code ON public.connection_codes (code);
CREATE INDEX IF NOT EXISTS idx_connection_codes_expires ON public.connection_codes (expires_at);

ALTER TABLE public.connection_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only connection_codes" ON public.connection_codes FOR ALL USING (false);

-- Note: With service_role key, RLS is bypassed. Your API uses service_role so it can still read/write.
