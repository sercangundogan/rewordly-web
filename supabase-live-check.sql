-- Live check (check-as-you-type) cost control. Run once in the Supabase SQL Editor.
-- Safe to re-run. Like the rest of the schema, only the service role (the API) can access these tables.

-- 1. Shared result cache: identical sentences are sent to the model once, for all users.
CREATE TABLE IF NOT EXISTS public.check_cache (
  key TEXT PRIMARY KEY,                    -- sha1(prompt version + model + sentence text)
  result JSONB NOT NULL,                   -- { language, issues[] }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_check_cache_created ON public.check_cache (created_at);
ALTER TABLE public.check_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only check_cache" ON public.check_cache;
CREATE POLICY "Service role only check_cache" ON public.check_cache FOR ALL USING (false);

-- 2. Character quotas for live checks, per identity and period.
--    identity: 'user:<uuid>' | 'anon:<anonymous id>' | 'ip:<salted hash>'
--    period:   'lifetime' (anonymous trial) | 'YYYY-MM-DD' (daily) | 'YYYY-MM' (monthly)
CREATE TABLE IF NOT EXISTS public.auto_quota (
  identity TEXT NOT NULL,
  period TEXT NOT NULL,
  chars INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identity, period)
);
ALTER TABLE public.auto_quota ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only auto_quota" ON public.auto_quota;
CREATE POLICY "Service role only auto_quota" ON public.auto_quota FOR ALL USING (false);

-- Atomic add (no read-then-write race between parallel requests). Returns the new total.
CREATE OR REPLACE FUNCTION public.add_auto_quota(p_identity TEXT, p_period TEXT, p_chars INTEGER)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.auto_quota (identity, period, chars)
  VALUES (p_identity, p_period, p_chars)
  ON CONFLICT (identity, period)
  DO UPDATE SET chars = public.auto_quota.chars + EXCLUDED.chars, updated_at = now()
  RETURNING chars;
$$;
REVOKE ALL ON FUNCTION public.add_auto_quota(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

-- 3. Token usage per model call: real cost numbers + the global daily budget guard.
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id BIGSERIAL PRIMARY KEY,
  feature TEXT NOT NULL,                   -- 'live_check'
  identity TEXT NOT NULL,
  tier TEXT NOT NULL,                      -- 'anonymous' | 'free' | 'pro'
  model TEXT NOT NULL,
  chars INTEGER NOT NULL,                  -- characters sent to the model
  input_tokens INTEGER NOT NULL,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(12, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON public.ai_usage_log (created_at);
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only ai_usage_log" ON public.ai_usage_log;
CREATE POLICY "Service role only ai_usage_log" ON public.ai_usage_log FOR ALL USING (false);

-- Today's (UTC) spend, used by the budget guard without fetching every row.
CREATE OR REPLACE FUNCTION public.ai_spend_today(p_feature TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
  FROM public.ai_usage_log
  WHERE feature = p_feature AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';
$$;
REVOKE ALL ON FUNCTION public.ai_spend_today(TEXT) FROM PUBLIC, anon, authenticated;

-- 4. Cache lifetime. The API ignores check_cache rows older than CHECK_CACHE_TTL_DAYS (default 30)
--    and rewrites them with a fresh created_at; this removes the leftovers so the table does not grow.
CREATE OR REPLACE FUNCTION public.purge_check_cache(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE removed INTEGER;
BEGIN
  DELETE FROM public.check_cache WHERE created_at < now() - make_interval(days => p_days);
  GET DIAGNOSTICS removed = ROW_COUNT;
  DELETE FROM public.check_feedback WHERE created_at < now() - interval '90 days';
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_check_cache(INTEGER) FROM PUBLIC, anon, authenticated;

-- 5. Suggestions people keep ignoring.
--    fp = sha1 of (sentence, position, original, replacement), computed by the API and handed to the
--    extension with each issue; no text is stored. One vote per identity. When enough different
--    identities ignored the same suggestion it lands in check_suppressions and is no longer returned.
--    Delete a row from check_suppressions to bring a suggestion back.
CREATE TABLE IF NOT EXISTS public.check_feedback (
  fp TEXT NOT NULL,
  identity TEXT NOT NULL,                  -- 'user:<uuid>' | 'anon:<anonymous id>'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fp, identity)
);
ALTER TABLE public.check_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only check_feedback" ON public.check_feedback;
CREATE POLICY "Service role only check_feedback" ON public.check_feedback FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS public.check_suppressions (
  fp TEXT PRIMARY KEY,
  votes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.check_suppressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only check_suppressions" ON public.check_suppressions;
CREATE POLICY "Service role only check_suppressions" ON public.check_suppressions FOR ALL USING (false);

-- Records one identity's ignore for each fingerprint and suppresses those that reached the threshold.
CREATE OR REPLACE FUNCTION public.add_check_feedback(p_identity TEXT, p_fps TEXT[], p_min_users INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE suppressed INTEGER;
BEGIN
  INSERT INTO public.check_feedback (fp, identity)
  SELECT DISTINCT unnest(p_fps), p_identity
  ON CONFLICT DO NOTHING;

  INSERT INTO public.check_suppressions (fp, votes)
  SELECT fp, count(*) FROM public.check_feedback
  WHERE fp = ANY (p_fps)
  GROUP BY fp
  HAVING count(*) >= p_min_users
  ON CONFLICT (fp) DO UPDATE SET votes = EXCLUDED.votes;
  GET DIAGNOSTICS suppressed = ROW_COUNT;
  RETURN suppressed;
END;
$$;
REVOKE ALL ON FUNCTION public.add_check_feedback(TEXT, TEXT[], INTEGER) FROM PUBLIC, anon, authenticated;

-- Weekly cleanup (Sundays 03:00 UTC) with pg_cron. If pg_cron is not enabled yet (Database > Extensions),
-- this only prints a notice; run `SELECT public.purge_check_cache();` by hand now and then instead.
DO $$
BEGIN
  PERFORM cron.schedule('purge-check-cache', '0 3 * * 0', 'SELECT public.purge_check_cache(30)');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron is not available, skipping the schedule: %', SQLERRM;
END $$;
