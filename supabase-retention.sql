-- Data retention: keeps the tables that grow with every request from growing for ever.
-- Run once in the Supabase SQL Editor, after supabase-live-check.sql and supabase-site-usage.sql. Safe to re-run.
-- Needs pg_cron (Database > Extensions > pg_cron) for the daily schedule at the end; without it the
-- function still exists and can be run by hand: SELECT public.purge_old_data();
--
-- What is removed, every day at 03:15 UTC:
--   ai_usage_log      rows older than 90 days, after they are summed into ai_usage_daily (cost history stays)
--   auto_quota        daily counters older than 7 days and monthly ones older than 2 months
--                     (the API only reads today's and this month's; 'lifetime' trial rows are never removed)
--   check_cache       rows older than 30 days, and check_feedback older than 90 days (purge_check_cache)
--   connection_codes  codes expired for more than a day (never exchanged; they hold tokens)
--   site_usage        rows older than 365 days
--   usage             legacy daily counters older than 90 days (the API only reads today's)
--
-- Note for supabase-analytics.sql: queries 2 and 3 ("new users", "retention") look for an identity's first
-- row in ai_usage_log, so they only see the last 90 days.

-- 1. Daily totals that outlive the raw rows.
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  day DATE NOT NULL,                       -- UTC
  feature TEXT NOT NULL,
  tier TEXT NOT NULL,
  model TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT '',           -- '' when the call had no host
  calls INTEGER NOT NULL,
  identities INTEGER NOT NULL,             -- distinct identities that day for this row's key
  chars BIGINT NOT NULL,
  input_tokens BIGINT NOT NULL,
  cached_input_tokens BIGINT NOT NULL,
  output_tokens BIGINT NOT NULL,
  cost_usd NUMERIC(14, 8) NOT NULL,
  PRIMARY KEY (day, feature, tier, model, host)
);
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only ai_usage_daily" ON public.ai_usage_daily;
CREATE POLICY "Service role only ai_usage_daily" ON public.ai_usage_daily FOR ALL USING (false);

-- 2. The cleanup. Returns what it removed, e.g. {"ai_usage_log": 1200, "auto_quota": 80, ...}.
CREATE OR REPLACE FUNCTION public.purge_old_data(p_usage_days INTEGER DEFAULT 90)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'utc')::date;
  usage_cutoff TIMESTAMPTZ := (today - p_usage_days)::timestamp AT TIME ZONE 'utc';  -- whole UTC days only
  result JSONB := '{}'::jsonb;
  n INTEGER;
BEGIN
  -- ai_usage_log: sum whole days into ai_usage_daily, then drop the raw rows (same transaction).
  INSERT INTO public.ai_usage_daily AS d
    (day, feature, tier, model, host, calls, identities, chars, input_tokens, cached_input_tokens, output_tokens, cost_usd)
  SELECT (created_at AT TIME ZONE 'utc')::date, feature, tier, model, COALESCE(host, ''),
         count(*), count(DISTINCT identity), sum(chars), sum(input_tokens), sum(cached_input_tokens),
         sum(output_tokens), sum(cost_usd)
  FROM public.ai_usage_log
  WHERE created_at < usage_cutoff
  GROUP BY 1, 2, 3, 4, 5
  ON CONFLICT (day, feature, tier, model, host) DO UPDATE SET
    calls = d.calls + EXCLUDED.calls,
    identities = GREATEST(d.identities, EXCLUDED.identities),
    chars = d.chars + EXCLUDED.chars,
    input_tokens = d.input_tokens + EXCLUDED.input_tokens,
    cached_input_tokens = d.cached_input_tokens + EXCLUDED.cached_input_tokens,
    output_tokens = d.output_tokens + EXCLUDED.output_tokens,
    cost_usd = d.cost_usd + EXCLUDED.cost_usd;
  DELETE FROM public.ai_usage_log WHERE created_at < usage_cutoff;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('ai_usage_log', n);

  -- auto_quota periods: 'lifetime' | 'YYYY-MM-DD' | 'YYYY-MM-DD:<feature>' | 'YYYY-MM' (all UTC).
  DELETE FROM public.auto_quota
  WHERE (period ~ '^\d{4}-\d{2}-\d{2}' AND left(period, 10) < to_char(today - 7, 'YYYY-MM-DD'))
     OR (period ~ '^\d{4}-\d{2}$' AND period < to_char(today - interval '2 months', 'YYYY-MM'));
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('auto_quota', n);

  result := result || jsonb_build_object('check_cache', public.purge_check_cache(30));

  DELETE FROM public.connection_codes WHERE expires_at < now() - interval '1 day';
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('connection_codes', n);

  DELETE FROM public.site_usage WHERE day < today - 365;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('site_usage', n);

  DELETE FROM public.usage WHERE date < today - 90;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('usage', n);

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_old_data(INTEGER) FROM PUBLIC, anon, authenticated;

-- 3. Daily schedule. Replaces the weekly 'purge-check-cache' job (purge_old_data calls it).
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('purge-check-cache');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- not scheduled
  END;
  PERFORM cron.schedule('purge-old-data', '15 3 * * *', 'SELECT public.purge_old_data()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron is not available, skipping the schedule: %', SQLERRM;
END $$;
