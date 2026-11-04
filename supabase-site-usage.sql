-- Feature usage per site, per user, per day. Run once in the Supabase SQL Editor. Safe to re-run.
-- Written only by the API (service role): POST /api/events from the extension, see lib/metrics.ts.
--
-- One row per (day, identity, host, event) with a running count, so the table stays small:
-- roughly active users × sites they use × features they use, per day.
-- host is the site's hostname only ("medium.com"; "www." dropped). Never a full URL or any text.
-- Local and intranet hosts (localhost, IPs, *.local, *.internal, ...) are stored as 'private'.

CREATE TABLE IF NOT EXISTS public.site_usage (
  day DATE NOT NULL,                       -- UTC
  identity TEXT NOT NULL,                  -- 'user:<uuid>' | 'anon:<anonymous id>' (same as auto_quota)
  tier TEXT NOT NULL,                      -- 'anonymous' | 'free' | 'pro' (latest seen that day)
  host TEXT NOT NULL,
  event TEXT NOT NULL,                     -- see EVENTS in lib/metrics.ts
  count INTEGER NOT NULL DEFAULT 0,
  chars BIGINT NOT NULL DEFAULT 0,         -- characters involved (live_check: sent for checking)
  version TEXT,                            -- extension version (latest seen that day)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, identity, host, event)
);
CREATE INDEX IF NOT EXISTS idx_site_usage_day ON public.site_usage (day);
CREATE INDEX IF NOT EXISTS idx_site_usage_host_day ON public.site_usage (host, day);
ALTER TABLE public.site_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only site_usage" ON public.site_usage;
CREATE POLICY "Service role only site_usage" ON public.site_usage FOR ALL USING (false);

-- Adds a batch of counters atomically. p_rows: [{ "host": "...", "event": "...", "count": 1, "chars": 0 }]
-- (the API merges duplicates first: one row per host + event).
CREATE OR REPLACE FUNCTION public.add_site_usage(p_identity TEXT, p_tier TEXT, p_version TEXT, p_rows JSONB)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.site_usage (day, identity, tier, host, event, count, chars, version)
  SELECT (now() AT TIME ZONE 'utc')::date, p_identity, p_tier, r.host, r.event, r.count, r.chars, p_version
  FROM jsonb_to_recordset(p_rows) AS r(host TEXT, event TEXT, count INTEGER, chars BIGINT)
  ON CONFLICT (day, identity, host, event) DO UPDATE SET
    count = public.site_usage.count + EXCLUDED.count,
    chars = public.site_usage.chars + EXCLUDED.chars,
    tier = EXCLUDED.tier,
    version = EXCLUDED.version,
    updated_at = now();
$$;
REVOKE ALL ON FUNCTION public.add_site_usage(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- AI cost per site: the live check API also records which site a check came from.
ALTER TABLE public.ai_usage_log ADD COLUMN IF NOT EXISTS host TEXT;
