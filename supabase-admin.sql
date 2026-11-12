-- Admin dashboard (pages/admin.tsx, /api/admin/*). Run once in the Supabase SQL Editor, after the other
-- supabase-*.sql files. Safe to re-run. Read only: these functions never change data.
-- Only the service role can call them; the API checks the signed-in email against ADMIN_EMAILS first.
--
-- "Active" means the identity shows up in any of: site_usage (extension 1.8.0+ events), usage (rewrite and
-- grammar counters, every extension version), ai_usage_log (model calls). Identities are 'user:<uuid>' or
-- 'anon:<id>'. Days are UTC. ai_usage_log keeps 90 days (supabase-retention.sql); older cost comes from
-- ai_usage_daily. "Plan" is the plan today, not the plan on that day.

-- Every (day, identity) pair seen since p_from.
CREATE OR REPLACE FUNCTION public.admin_activity(p_from DATE)
RETURNS TABLE (day DATE, identity TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.day, s.identity FROM public.site_usage s WHERE s.day >= p_from
  UNION
  SELECT u.date, u.identity FROM public.usage u WHERE u.date >= p_from AND u.identity ~ '^(user|anon):'
  UNION
  SELECT (l.created_at AT TIME ZONE 'utc')::date, l.identity FROM public.ai_usage_log l
  WHERE l.created_at >= (p_from::timestamp AT TIME ZONE 'utc') AND l.identity ~ '^(user|anon):';
$$;
REVOKE ALL ON FUNCTION public.admin_activity(DATE) FROM PUBLIC, anon, authenticated;

-- 'user:<uuid>' of everyone with Pro access right now (same rule as lib/auth.ts).
CREATE OR REPLACE FUNCTION public.admin_pro_identities()
RETURNS TABLE (identity TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'user:' || user_id FROM public.subscriptions
  WHERE status = 'active' OR (status = 'cancelled' AND current_period_end > now());
$$;
REVOKE ALL ON FUNCTION public.admin_pro_identities() FROM PUBLIC, anon, authenticated;

-- Everything the dashboard shows for the last p_days days (1 to 365), with the period before for comparison.
CREATE OR REPLACE FUNCTION public.admin_dashboard(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_from DATE := v_today - (v_days - 1);        -- first day of the period
  v_prev DATE := v_from - v_days;                -- first day of the period before
  v_out JSONB;
  v_part JSONB;
BEGIN
  v_out := jsonb_build_object(
    'generated_at', now(),
    'today', v_today,
    'from', v_from,
    'days', v_days
  );

  -- KPIs for this period and the one before. cur = this period, prev = the period before.
  WITH act AS (
    SELECT a.day, a.identity, a.day >= v_from AS cur FROM public.admin_activity(v_prev) a
  ),
  firsts AS (
    SELECT a.identity, min(a.day) AS first_day FROM public.admin_activity(v_today - 364) a GROUP BY 1
  ),
  ev AS (
    SELECT s.day >= v_from AS cur, s.event, s.identity, s.count, s.chars
    FROM public.site_usage s WHERE s.day >= v_prev
  ),
  legacy AS (
    SELECT u.date >= v_from AS cur, sum(u.rewrite_count) AS rewrites, sum(u.grammar_count) AS grammar
    FROM public.usage u WHERE u.date >= v_prev GROUP BY 1
  ),
  cost AS (
    SELECT (l.created_at AT TIME ZONE 'utc')::date >= v_from AS cur, l.feature, l.cost_usd, l.chars
    FROM public.ai_usage_log l WHERE l.created_at >= (v_prev::timestamp AT TIME ZONE 'utc')
    UNION ALL
    SELECT d.day >= v_from, d.feature, d.cost_usd, d.chars
    FROM public.ai_usage_daily d WHERE d.day >= v_prev
  ),
  signups AS (
    SELECT (u.created_at AT TIME ZONE 'utc')::date >= v_from AS cur FROM auth.users u
    WHERE u.created_at >= (v_prev::timestamp AT TIME ZONE 'utc')
  ),
  per_period AS (
    SELECT p.cur,
      (SELECT count(DISTINCT identity) FROM act WHERE act.cur = p.cur) AS active_users,
      (SELECT count(*) FROM (SELECT identity FROM act WHERE act.cur = p.cur GROUP BY 1 HAVING count(*) > 1) r) AS returning_users,
      (SELECT count(*) FROM firsts f WHERE f.first_day >= CASE WHEN p.cur THEN v_from ELSE v_prev END
                                       AND f.first_day < CASE WHEN p.cur THEN v_today + 1 ELSE v_from END) AS new_users,
      (SELECT count(*) FROM signups s WHERE s.cur = p.cur) AS signups,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event = 'live_check') AS live_checks,
      (SELECT COALESCE(sum(chars), 0) FROM ev WHERE ev.cur = p.cur AND event = 'live_check') AS live_chars,
      (SELECT count(DISTINCT identity) FROM ev WHERE ev.cur = p.cur AND event = 'live_check') AS live_users,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event = 'live_fix') AS fixes,
      (SELECT count(DISTINCT identity) FROM ev WHERE ev.cur = p.cur AND event = 'live_fix') AS fix_users,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event = 'live_fix_all') AS fix_all,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event IN ('live_ignore', 'live_ignore_always')) AS ignores,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event = 'live_dictionary') AS dictionary,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event LIKE '%\_limit') AS limit_events,
      (SELECT count(DISTINCT identity) FROM ev WHERE ev.cur = p.cur AND event LIKE '%\_limit') AS limit_users,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event = 'live_off') AS live_off,
      (SELECT count(DISTINCT identity) FROM ev WHERE ev.cur = p.cur AND event = 'live_off') AS live_off_users,
      (SELECT COALESCE(sum(count), 0) FROM ev WHERE ev.cur = p.cur AND event = 'site_disable') AS site_disables,
      (SELECT count(DISTINCT identity) FROM ev WHERE ev.cur = p.cur AND event = 'site_disable') AS site_disable_users,
      (SELECT COALESCE(sum(rewrites), 0) FROM legacy WHERE legacy.cur = p.cur) AS rewrites,
      (SELECT COALESCE(sum(grammar), 0) FROM legacy WHERE legacy.cur = p.cur) AS grammar,
      (SELECT COALESCE(sum(cost_usd), 0) FROM cost WHERE cost.cur = p.cur) AS ai_cost,
      (SELECT COALESCE(sum(chars), 0) FROM cost WHERE cost.cur = p.cur AND feature = 'live_check') AS model_chars
    FROM (VALUES (true), (false)) p(cur)
  )
  SELECT jsonb_build_object(
    'cur', (SELECT to_jsonb(x) - 'cur' FROM per_period x WHERE x.cur),
    'prev', (SELECT to_jsonb(x) - 'cur' FROM per_period x WHERE NOT x.cur)
  ) INTO v_part;
  v_out := v_out || jsonb_build_object('kpis', v_part);

  -- Values that do not depend on the chosen period.
  WITH act AS (SELECT a.day, a.identity FROM public.admin_activity(v_today - 29) a)
  SELECT jsonb_build_object(
    'dau', (SELECT count(DISTINCT identity) FROM act WHERE day = v_today),
    'dau_yesterday', (SELECT count(DISTINCT identity) FROM act WHERE day = v_today - 1),
    'wau', (SELECT count(DISTINCT identity) FROM act WHERE day > v_today - 7),
    'mau', (SELECT count(DISTINCT identity) FROM act),
    'accounts', (SELECT count(*) FROM auth.users),
    'cost_today', (SELECT COALESCE(sum(cost_usd), 0) FROM public.ai_usage_log
                   WHERE created_at >= (v_today::timestamp AT TIME ZONE 'utc')),
    'live_cost_today', public.ai_spend_today('live_check'),
    'cost_30d', (SELECT COALESCE(sum(cost_usd), 0) FROM public.ai_usage_log
                 WHERE created_at >= ((v_today - 29)::timestamp AT TIME ZONE 'utc'))
                + (SELECT COALESCE(sum(cost_usd), 0) FROM public.ai_usage_daily WHERE day >= v_today - 29),
    'subscriptions', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'plan', plan, 'status', status, 'cancel_at_period_end', cancel_at_period_end,
        'current_period_end', current_period_end)), '[]'::jsonb) FROM public.subscriptions)
  ) INTO v_part;
  v_out := v_out || jsonb_build_object('now', v_part);

  -- One row per day of the period (days with no data included).
  WITH days AS (SELECT generate_series(v_from, v_today, interval '1 day')::date AS day),
  pro AS (SELECT identity FROM public.admin_pro_identities()),
  act AS (SELECT a.day, a.identity FROM public.admin_activity(v_from) a),
  firsts AS (SELECT a.identity, min(a.day) AS first_day FROM public.admin_activity(v_today - 364) a GROUP BY 1),
  ev AS (
    SELECT s.day,
      sum(s.count) FILTER (WHERE s.event = 'live_check') AS live_checks,
      sum(s.chars) FILTER (WHERE s.event = 'live_check') AS live_chars,
      sum(s.count) FILTER (WHERE s.event = 'live_fix') AS fixes,
      sum(s.count) FILTER (WHERE s.event IN ('live_ignore', 'live_ignore_always')) AS ignores,
      sum(s.count) FILTER (WHERE s.event LIKE '%\_limit') AS limit_events,
      count(DISTINCT s.identity) FILTER (WHERE s.event LIKE '%\_limit') AS limit_users
    FROM public.site_usage s WHERE s.day >= v_from GROUP BY 1
  ),
  legacy AS (
    SELECT u.date AS day, sum(u.rewrite_count) AS rewrites, sum(u.grammar_count) AS grammar
    FROM public.usage u WHERE u.date >= v_from GROUP BY 1
  ),
  cost_rows AS (
    SELECT (l.created_at AT TIME ZONE 'utc')::date AS day, l.model, l.feature, l.cost_usd, l.chars
    FROM public.ai_usage_log l WHERE l.created_at >= (v_from::timestamp AT TIME ZONE 'utc')
    UNION ALL
    SELECT d.day, d.model, d.feature, d.cost_usd, d.chars FROM public.ai_usage_daily d WHERE d.day >= v_from
  ),
  cost_model AS (
    SELECT day, jsonb_object_agg(model, round(c, 6)) AS by_model, sum(c) AS total
    FROM (SELECT day, model, sum(cost_usd) AS c FROM cost_rows GROUP BY 1, 2) m GROUP BY 1
  ),
  cost_feature AS (
    SELECT day, jsonb_object_agg(feature, round(c, 6)) AS by_feature, sum(ch) AS model_chars
    FROM (SELECT day, feature, sum(cost_usd) AS c, sum(chars) FILTER (WHERE feature = 'live_check') AS ch
          FROM cost_rows GROUP BY 1, 2) f GROUP BY 1
  ),
  active AS (
    SELECT act.day,
      count(*) FILTER (WHERE act.identity LIKE 'anon:%') AS anon,
      count(*) FILTER (WHERE act.identity LIKE 'user:%' AND pro.identity IS NULL) AS free,
      count(*) FILTER (WHERE pro.identity IS NOT NULL) AS pro
    FROM act LEFT JOIN pro USING (identity) GROUP BY 1
  ),
  news AS (SELECT first_day AS day, count(*) AS new_users FROM firsts WHERE first_day >= v_from GROUP BY 1),
  signups AS (
    SELECT (created_at AT TIME ZONE 'utc')::date AS day, count(*) AS signups FROM auth.users
    WHERE created_at >= (v_from::timestamp AT TIME ZONE 'utc') GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'day', d.day,
      'anon', COALESCE(a.anon, 0), 'free', COALESCE(a.free, 0), 'pro', COALESCE(a.pro, 0),
      'new_users', COALESCE(n.new_users, 0), 'signups', COALESCE(su.signups, 0),
      'live_checks', COALESCE(e.live_checks, 0), 'live_chars', COALESCE(e.live_chars, 0),
      'fixes', COALESCE(e.fixes, 0), 'ignores', COALESCE(e.ignores, 0),
      'limit_events', COALESCE(e.limit_events, 0), 'limit_users', COALESCE(e.limit_users, 0),
      'rewrites', COALESCE(l.rewrites, 0), 'grammar', COALESCE(l.grammar, 0),
      'cost', round(COALESCE(cm.total, 0), 6), 'cost_by_model', COALESCE(cm.by_model, '{}'::jsonb),
      'cost_by_feature', COALESCE(cf.by_feature, '{}'::jsonb), 'model_chars', COALESCE(cf.model_chars, 0)
    ) ORDER BY d.day), '[]'::jsonb)
  INTO v_part
  FROM days d
  LEFT JOIN active a USING (day) LEFT JOIN news n USING (day) LEFT JOIN signups su USING (day)
  LEFT JOIN ev e USING (day) LEFT JOIN legacy l USING (day)
  LEFT JOIN cost_model cm USING (day) LEFT JOIN cost_feature cf USING (day);
  v_out := v_out || jsonb_build_object('daily', v_part);

  -- AI spend in the period split by plan and by feature (raw log only: tier is not kept per user for older days).
  SELECT jsonb_build_object(
    'by_tier', COALESCE((SELECT jsonb_object_agg(tier, round(c, 6)) FROM (
        SELECT tier, sum(cost_usd) AS c FROM public.ai_usage_log
        WHERE created_at >= (v_from::timestamp AT TIME ZONE 'utc') GROUP BY 1) t), '{}'::jsonb),
    'by_feature', COALESCE((SELECT jsonb_object_agg(feature, round(c, 6)) FROM (
        SELECT feature, sum(cost_usd) AS c FROM public.ai_usage_log
        WHERE created_at >= (v_from::timestamp AT TIME ZONE 'utc') GROUP BY 1) t), '{}'::jsonb),
    'by_model', COALESCE((SELECT jsonb_object_agg(model, jsonb_build_object('cost', round(c, 6), 'calls', n)) FROM (
        SELECT model, sum(cost_usd) AS c, count(*) AS n FROM public.ai_usage_log
        WHERE created_at >= (v_from::timestamp AT TIME ZONE 'utc') GROUP BY 1) t), '{}'::jsonb)
  ) INTO v_part;
  v_out := v_out || jsonb_build_object('cost_split', v_part);

  -- Anonymous trial (15,000 characters, all time): how far people get.
  SELECT jsonb_build_object(
    'started', count(*),
    'over_1k', count(*) FILTER (WHERE chars >= 1000),
    'over_half', count(*) FILTER (WHERE chars >= 7500),
    'used_up', count(*) FILTER (WHERE chars >= 15000)
  ) INTO v_part
  FROM public.auto_quota WHERE period = 'lifetime' AND identity LIKE 'anon:%';
  v_out := v_out || jsonb_build_object('trial', v_part);

  -- Daily cohorts (last 14 first days): did people come back the next day, within 7 days, at all?
  WITH act AS (SELECT DISTINCT a.day, a.identity FROM public.admin_activity(v_today - 364) a),
  firsts AS (SELECT identity, min(day) AS first_day FROM act GROUP BY 1)
  SELECT COALESCE(jsonb_agg(c ORDER BY c->>'first_day' DESC), '[]'::jsonb) INTO v_part FROM (
    SELECT jsonb_build_object(
      'first_day', f.first_day,
      'size', count(*),
      'd1', CASE WHEN f.first_day + 1 <= v_today THEN count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM act x WHERE x.identity = f.identity AND x.day = f.first_day + 1)) END,
      'd7', CASE WHEN f.first_day + 7 <= v_today THEN count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM act x WHERE x.identity = f.identity AND x.day > f.first_day AND x.day <= f.first_day + 7)) END,
      'any', CASE WHEN f.first_day < v_today THEN count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM act x WHERE x.identity = f.identity AND x.day > f.first_day)) END
    ) AS c
    FROM firsts f WHERE f.first_day > v_today - 14 GROUP BY f.first_day
  ) q;
  v_out := v_out || jsonb_build_object('cohorts', v_part);

  -- Sites in the period.
  WITH s AS (
    SELECT host,
      count(DISTINCT identity) AS users,
      COALESCE(sum(count) FILTER (WHERE event = 'live_check'), 0) AS live_checks,
      COALESCE(sum(chars) FILTER (WHERE event = 'live_check'), 0) AS live_chars,
      COALESCE(sum(count) FILTER (WHERE event = 'live_fix'), 0) AS fixes,
      COALESCE(sum(count) FILTER (WHERE event IN ('live_ignore', 'live_ignore_always')), 0) AS ignores,
      COALESCE(sum(count) FILTER (WHERE event = 'rewrite'), 0) AS rewrites,
      COALESCE(sum(count) FILTER (WHERE event = 'grammar'), 0) AS grammar,
      COALESCE(sum(count) FILTER (WHERE event LIKE '%\_limit'), 0) AS limit_events
    FROM public.site_usage WHERE day >= v_from AND host <> 'none' GROUP BY 1
  ),
  c AS (
    SELECT host, sum(cost_usd) AS cost FROM public.ai_usage_log
    WHERE created_at >= (v_from::timestamp AT TIME ZONE 'utc') AND host IS NOT NULL GROUP BY 1
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.users DESC, r.live_checks DESC), '[]'::jsonb) INTO v_part FROM (
    SELECT s.*, round(COALESCE(c.cost, 0), 6) AS cost FROM s LEFT JOIN c USING (host)
    ORDER BY s.users DESC, s.live_checks DESC LIMIT 30
  ) r;
  v_out := v_out || jsonb_build_object('sites', v_part);

  -- Where people turn Rewordly off (extension newer than 1.8.0). site_disable / site_enable: "Disable Rewordly on this
  -- page" and back. live_off / live_on: the live check switch in the popup, under the site of the tab it was
  -- opened on ('none' when that was not a website).
  SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.users DESC, r.site_disables + r.live_off DESC), '[]'::jsonb) INTO v_part FROM (
    SELECT host,
      count(DISTINCT identity) FILTER (WHERE event IN ('site_disable', 'live_off')) AS users,
      COALESCE(sum(count) FILTER (WHERE event = 'site_disable'), 0) AS site_disables,
      COALESCE(sum(count) FILTER (WHERE event = 'site_enable'), 0) AS site_enables,
      COALESCE(sum(count) FILTER (WHERE event = 'live_off'), 0) AS live_off,
      COALESCE(sum(count) FILTER (WHERE event = 'live_on'), 0) AS live_on
    FROM public.site_usage
    WHERE day >= v_from AND event IN ('site_disable', 'site_enable', 'live_off', 'live_on')
    GROUP BY 1 ORDER BY 2 DESC, 3 DESC LIMIT 30
  ) r;
  v_out := v_out || jsonb_build_object('turned_off', v_part);

  -- Extension versions seen in the last 7 days. Versions before 1.8.0 send no events: they only show in usage.
  WITH latest AS (
    SELECT DISTINCT ON (identity) identity, version FROM public.site_usage
    WHERE day > v_today - 7 AND version IS NOT NULL ORDER BY identity, day DESC, updated_at DESC
  ),
  old AS (
    SELECT DISTINCT identity FROM public.usage WHERE date > v_today - 7 AND identity ~ '^(user|anon):'
    EXCEPT SELECT identity FROM latest
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('version', v, 'users', n) ORDER BY n DESC), '[]'::jsonb) INTO v_part
  FROM (
    SELECT version AS v, count(*) AS n FROM latest GROUP BY 1
    UNION ALL
    SELECT 'before 1.8.0', count(*) FROM old HAVING count(*) > 0
  ) q;
  v_out := v_out || jsonb_build_object('versions', v_part);

  -- Most active people in the period.
  WITH pro AS (SELECT identity FROM public.admin_pro_identities()),
  act AS (SELECT identity, count(DISTINCT day) AS days, max(day) AS last_day FROM public.admin_activity(v_from) GROUP BY 1),
  ev AS (
    SELECT identity,
      COALESCE(sum(count) FILTER (WHERE event = 'live_check'), 0) AS live_checks,
      COALESCE(sum(chars) FILTER (WHERE event = 'live_check'), 0) AS live_chars,
      COALESCE(sum(count) FILTER (WHERE event = 'live_fix'), 0) AS fixes,
      COALESCE(sum(count) FILTER (WHERE event LIKE '%\_limit'), 0) AS limit_events,
      count(DISTINCT host) AS sites
    FROM public.site_usage WHERE day >= v_from GROUP BY 1
  ),
  legacy AS (
    SELECT identity, sum(rewrite_count) AS rewrites, sum(grammar_count) AS grammar
    FROM public.usage WHERE date >= v_from GROUP BY 1
  ),
  c AS (
    SELECT identity, sum(cost_usd) AS cost FROM public.ai_usage_log
    WHERE created_at >= (v_from::timestamp AT TIME ZONE 'utc') GROUP BY 1
  ),
  firsts AS (SELECT a.identity, min(a.day) AS first_day FROM public.admin_activity(v_today - 364) a GROUP BY 1)
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_part FROM (
    SELECT act.identity, u.email,
      CASE WHEN pro.identity IS NOT NULL THEN 'pro' WHEN act.identity LIKE 'user:%' THEN 'free' ELSE 'anonymous' END AS plan,
      act.days, act.last_day, f.first_day,
      COALESCE(ev.live_checks, 0) AS live_checks, COALESCE(ev.live_chars, 0) AS live_chars,
      COALESCE(ev.fixes, 0) AS fixes, COALESCE(lg.rewrites, 0) AS rewrites, COALESCE(lg.grammar, 0) AS grammar,
      COALESCE(ev.limit_events, 0) AS limit_events, COALESCE(ev.sites, 0) AS sites,
      round(COALESCE(c.cost, 0), 6) AS cost,
      q.chars AS trial_chars
    FROM act
    LEFT JOIN ev USING (identity) LEFT JOIN legacy lg USING (identity) LEFT JOIN c USING (identity)
    LEFT JOIN firsts f USING (identity) LEFT JOIN pro USING (identity)
    LEFT JOIN auth.users u ON act.identity = 'user:' || u.id
    LEFT JOIN public.auto_quota q ON q.identity = act.identity AND q.period = 'lifetime'
    ORDER BY COALESCE(ev.live_chars, 0) + 300 * (COALESCE(lg.rewrites, 0) + COALESCE(lg.grammar, 0)) DESC, act.days DESC
    LIMIT 100
  ) r;
  v_out := v_out || jsonb_build_object('top_users', v_part);

  -- Who hit a limit in the period, most recent first.
  WITH pro AS (SELECT identity FROM public.admin_pro_identities())
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_part FROM (
    SELECT s.identity, u.email,
      CASE WHEN pro.identity IS NOT NULL THEN 'pro' WHEN s.identity LIKE 'user:%' THEN 'free' ELSE 'anonymous' END AS plan,
      jsonb_object_agg(s.event, s.n) AS events, max(s.last_day) AS last_day
    FROM (
      SELECT identity, event, sum(count) AS n, max(day) AS last_day FROM public.site_usage
      WHERE day >= v_from AND event LIKE '%\_limit' GROUP BY 1, 2
    ) s
    LEFT JOIN pro USING (identity)
    LEFT JOIN auth.users u ON s.identity = 'user:' || u.id
    GROUP BY s.identity, u.email, pro.identity
    ORDER BY max(s.last_day) DESC, sum(s.n) DESC
    LIMIT 100
  ) r;
  v_out := v_out || jsonb_build_object('limit_hits', v_part);

  -- Newest accounts.
  WITH act AS (SELECT identity, count(DISTINCT day) AS days, max(day) AS last_day FROM public.admin_activity(v_today - 89) GROUP BY 1)
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_part FROM (
    SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
      s.status AS sub_status, s.plan AS sub_plan,
      act.days AS active_days_90d, act.last_day
    FROM auth.users u
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    LEFT JOIN act ON act.identity = 'user:' || u.id
    ORDER BY u.created_at DESC LIMIT 50
  ) r;
  v_out := v_out || jsonb_build_object('signups', v_part);

  -- Subscribers.
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_part FROM (
    SELECT u.email, s.user_id, s.plan, s.status, s.cancel_at_period_end, s.current_period_end, s.created_at, s.updated_at
    FROM public.subscriptions s LEFT JOIN auth.users u ON u.id = s.user_id
    ORDER BY s.created_at DESC
  ) r;
  v_out := v_out || jsonb_build_object('subscribers', v_part);

  -- Data health: table sizes, the retention job and the ignore feedback.
  SELECT jsonb_build_object(
    'tables', jsonb_build_object(
      'ai_usage_log', (SELECT count(*) FROM public.ai_usage_log),
      'ai_usage_daily', (SELECT count(*) FROM public.ai_usage_daily),
      'auto_quota', (SELECT count(*) FROM public.auto_quota),
      'check_cache', (SELECT count(*) FROM public.check_cache),
      'check_feedback', (SELECT count(*) FROM public.check_feedback),
      'check_suppressions', (SELECT count(*) FROM public.check_suppressions),
      'connection_codes', (SELECT count(*) FROM public.connection_codes),
      'site_usage', (SELECT count(*) FROM public.site_usage),
      'subscriptions', (SELECT count(*) FROM public.subscriptions),
      'usage', (SELECT count(*) FROM public.usage),
      'auth.users', (SELECT count(*) FROM auth.users)
    ),
    'oldest_ai_usage_log', (SELECT min(created_at) FROM public.ai_usage_log),
    'cache_empty_share', (SELECT round(avg(CASE WHEN jsonb_array_length(result->'issues') = 0 THEN 1 ELSE 0 END), 3)
                          FROM public.check_cache WHERE jsonb_typeof(result->'issues') = 'array')
  ) INTO v_part;
  BEGIN
    v_part := v_part || jsonb_build_object('cron', (
      SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM (
        SELECT j.jobname, d.status, d.start_time, d.end_time, left(d.return_message, 300) AS message
        FROM cron.job_run_details d JOIN cron.job j USING (jobid)
        ORDER BY d.start_time DESC LIMIT 5
      ) r));
  EXCEPTION WHEN OTHERS THEN
    v_part := v_part || jsonb_build_object('cron', NULL);
  END;
  v_out := v_out || jsonb_build_object('health', v_part);

  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dashboard(INTEGER) FROM PUBLIC, anon, authenticated;

-- One person, for support requests. p_query is an email (exact, any case), a 'user:'/'anon:' identity,
-- or a Supabase user id. Returns null when nothing matches.
CREATE OR REPLACE FUNCTION public.admin_user(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := btrim(COALESCE(p_query, ''));
  v_user auth.users%ROWTYPE;
  v_identity TEXT;
BEGIN
  IF v_q = '' THEN RETURN NULL; END IF;
  IF v_q ~* '^user:' THEN
    SELECT * INTO v_user FROM auth.users WHERE 'user:' || id = lower(v_q);
  ELSIF v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_user FROM auth.users WHERE id = v_q::uuid;
  ELSIF v_q LIKE '%@%' THEN
    SELECT * INTO v_user FROM auth.users WHERE lower(email) = lower(v_q);
  END IF;

  IF v_user.id IS NOT NULL THEN
    v_identity := 'user:' || v_user.id;
  ELSIF v_q ~* '^anon:' THEN
    v_identity := v_q;
  ELSE
    RETURN NULL;
  END IF;

  IF v_user.id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.site_usage WHERE identity = v_identity)
     AND NOT EXISTS (SELECT 1 FROM public.usage WHERE identity = v_identity)
     AND NOT EXISTS (SELECT 1 FROM public.auto_quota WHERE identity = v_identity)
     AND NOT EXISTS (SELECT 1 FROM public.ai_usage_log WHERE identity = v_identity) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'identity', v_identity,
    'account', CASE WHEN v_user.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_user.id, 'email', v_user.email, 'created_at', v_user.created_at,
      'last_sign_in_at', v_user.last_sign_in_at) END,
    'subscription', (SELECT to_jsonb(s) - 'id' - 'user_id' FROM public.subscriptions s WHERE s.user_id = v_user.id),
    'quota', (SELECT COALESCE(jsonb_agg(jsonb_build_object('period', period, 'chars', chars, 'updated_at', updated_at)
                ORDER BY period DESC), '[]'::jsonb)
              FROM (SELECT * FROM public.auto_quota WHERE identity = v_identity ORDER BY period DESC LIMIT 60) q),
    'usage', (SELECT COALESCE(jsonb_agg(jsonb_build_object('date', date, 'rewrites', rewrite_count, 'grammar', grammar_count)
                ORDER BY date DESC), '[]'::jsonb)
              FROM (SELECT * FROM public.usage WHERE identity = v_identity ORDER BY date DESC LIMIT 90) u),
    'events', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'host', host, 'event', event, 'count', count,
                 'chars', chars, 'version', version, 'tier', tier) ORDER BY day DESC, host, event), '[]'::jsonb)
               FROM (SELECT * FROM public.site_usage WHERE identity = v_identity ORDER BY day DESC LIMIT 500) e),
    'cost_daily', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day', day, 'calls', n, 'cost', round(c, 6), 'chars', ch)
                     ORDER BY day DESC), '[]'::jsonb)
                   FROM (SELECT (created_at AT TIME ZONE 'utc')::date AS day, count(*) AS n, sum(cost_usd) AS c, sum(chars) AS ch
                         FROM public.ai_usage_log WHERE identity = v_identity GROUP BY 1) x)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_user(TEXT) FROM PUBLIC, anon, authenticated;
