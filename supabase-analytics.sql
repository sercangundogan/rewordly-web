-- Live check analytics: read-only queries to run in the Supabase SQL Editor.
-- Sources: ai_usage_log (one row per model call), auto_quota (characters checked per identity/period),
-- subscriptions, auth.users. Identities are 'user:<uuid>' (signed in) or 'anon:<extension id>'.
-- Note: answers served from cache are not logged, so "active" here means "sent at least one new sentence".
-- Installs and uninstalls come from the Chrome Web Store developer dashboard, not from here.

-- 1. Daily active live-check users by plan (last 30 days)
select date_trunc('day', created_at)::date as day,
       tier,
       count(distinct identity) as active_users,
       count(*)                 as model_calls,
       sum(chars)               as chars_checked
from ai_usage_log
where feature = 'live_check' and created_at > now() - interval '30 days'
group by 1, 2
order by 1 desc, 2;

-- 2. New live-check users per day (first time an identity shows up)
select first_day, count(*) as new_users
from (
  select identity, min(created_at)::date as first_day
  from ai_usage_log
  where feature = 'live_check'
  group by identity
) firsts
group by first_day
order by first_day desc
limit 30;

-- 3. Retention: of the users who started N days ago, how many came back on a later day within 7 days
with firsts as (
  select identity, min(created_at)::date as first_day
  from ai_usage_log where feature = 'live_check' group by identity
),
returns as (
  select distinct l.identity
  from ai_usage_log l join firsts f using (identity)
  where l.created_at::date > f.first_day and l.created_at::date <= f.first_day + 7
)
select f.first_day,
       count(*)                                         as started,
       count(r.identity)                                as returned_within_7d,
       round(100.0 * count(r.identity) / count(*), 1)   as pct
from firsts f left join returns r using (identity)
where f.first_day <= current_date - 7
group by f.first_day
order by f.first_day desc
limit 30;

-- 4. Anonymous trial: how far people get through the 15,000-character trial
select case
         when chars >= 15000 then '4. trial used up'
         when chars >= 7500  then '3. over half'
         when chars >= 1000  then '2. tried it'
         else                     '1. barely started'
       end as stage,
       count(*) as users
from auto_quota
where period = 'lifetime' and identity like 'anon:%'
group by 1
order by 1;

-- 5. Sign-ups and Pro (anonymous ids can't be linked to accounts, so compare the totals over time)
select date_trunc('week', created_at)::date as week, count(*) as new_accounts
from auth.users
group by 1 order by 1 desc limit 12;

select count(*) filter (where status = 'active')                                         as pro_active,
       count(*) filter (where status = 'cancelled' and current_period_end > now())       as pro_cancelling
from subscriptions;

-- 6. Cost: AI spend per day by plan, and per active user
select date_trunc('day', created_at)::date as day,
       tier,
       round(sum(cost_usd), 4)                                     as spend_usd,
       round(sum(cost_usd) / nullif(count(distinct identity), 0), 5) as usd_per_active_user
from ai_usage_log
where feature = 'live_check' and created_at > now() - interval '30 days'
group by 1, 2
order by 1 desc, 2;

-- 7. Feature usage per site (needs supabase-site-usage.sql). Last 30 days.
--    Sites by number of people using Rewordly there, and what they do.
select host,
       count(distinct identity)                                        as users,
       sum(count) filter (where event = 'live_check')                  as live_checks,
       sum(count) filter (where event = 'live_fix')                    as fixes,
       sum(count) filter (where event = 'live_fix_all')                as fix_all,
       sum(count) filter (where event = 'live_ignore')                 as ignores,
       sum(count) filter (where event = 'rewrite')                     as rewrites,
       sum(count) filter (where event = 'grammar')                     as grammar_checks,
       sum(count) filter (where event in ('live_limit', 'rewrite_limit', 'grammar_limit')) as limit_hits
from site_usage
where day > current_date - 30
group by host
order by users desc, live_checks desc nulls last
limit 50;

-- 8. Does live checking help? Fixes applied per check, by site (higher = more useful there).
select host,
       sum(count) filter (where event = 'live_fix')::numeric
         / nullif(sum(count) filter (where event = 'live_check'), 0) as fixes_per_check,
       count(distinct identity)                                      as users
from site_usage
where day > current_date - 30
group by host
having count(distinct identity) >= 3
order by fixes_per_check desc nulls last;

-- 9. AI cost per site (live checks that reached the model). Last 30 days.
select coalesce(host, '(unknown)') as host,
       count(*)                    as model_calls,
       round(sum(cost_usd), 4)     as spend_usd
from ai_usage_log
where feature = 'live_check' and created_at > now() - interval '30 days'
group by 1
order by spend_usd desc;

-- 10. One user's activity (e.g. to understand a support request): replace the identity.
-- select day, host, event, count from site_usage where identity = 'user:<uuid>' order by day desc, host, event;
