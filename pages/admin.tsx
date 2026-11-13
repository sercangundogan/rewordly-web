import Head from 'next/head';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Custom404 from './404';
import { createSupabaseBrowser } from '../lib/supabase-browser';
import { AdminStyles } from '../components/admin/styles';
import { fmtNum, fmtUsd, HBars, Lines, Meter, Spark, StackedColumns, type Row, type Series } from '../components/admin/charts';

/**
 * Private admin dashboard. Not linked anywhere, noindex, not in the sitemap or robots.txt.
 * Data comes only from /api/admin/*, which answers 404 unless the signed-in email is in ADMIN_EMAILS;
 * until then this page renders the normal 404 page.
 */

type Num = number;
interface Kpis {
  active_users: Num; returning_users: Num; new_users: Num; signups: Num;
  live_checks: Num; live_chars: Num; live_users: Num; fixes: Num; fix_users: Num; fix_all: Num;
  ignores: Num; dictionary: Num; limit_events: Num; limit_users: Num;
  rewrites: Num; grammar: Num; ai_cost: Num; model_chars: Num;
  live_off: Num; live_off_users: Num; site_disables: Num; site_disable_users: Num;
}
interface Daily {
  day: string; anon: Num; free: Num; pro: Num; new_users: Num; signups: Num;
  live_checks: Num; live_chars: Num; fixes: Num; ignores: Num; limit_events: Num; limit_users: Num;
  rewrites: Num; grammar: Num; cost: Num; cost_by_model: Record<string, Num>; cost_by_feature: Record<string, Num>; model_chars: Num;
}
interface TopUser {
  identity: string; email: string | null; plan: string; days: Num; last_day: string; first_day: string | null;
  live_checks: Num; live_chars: Num; fixes: Num; rewrites: Num; grammar: Num; limit_events: Num; sites: Num;
  cost: Num; trial_chars: Num | null;
}
interface Dashboard {
  generated_at: string; today: string; from: string; days: Num;
  kpis: { cur: Kpis; prev: Kpis };
  now: { dau: Num; dau_yesterday: Num; wau: Num; mau: Num; accounts: Num; cost_today: Num; live_cost_today: Num; cost_30d: Num };
  daily: Daily[];
  cost_split: { by_tier: Record<string, Num>; by_feature: Record<string, Num>; by_model: Record<string, { cost: Num; calls: Num }> };
  trial: { started: Num; over_1k: Num; over_half: Num; used_up: Num };
  cohorts: { first_day: string; size: Num; d1: Num | null; d7: Num | null; any: Num | null }[];
  sites: { host: string; users: Num; live_checks: Num; live_chars: Num; fixes: Num; ignores: Num; rewrites: Num; grammar: Num; limit_events: Num; cost: Num }[];
  turned_off: { host: string; users: Num; site_disables: Num; site_enables: Num; live_off: Num; live_on: Num }[];
  versions: { version: string; users: Num }[];
  top_users: TopUser[];
  limit_hits: { identity: string; email: string | null; plan: string; events: Record<string, Num>; last_day: string }[];
  signups: { id: string; email: string; created_at: string; last_sign_in_at: string | null; sub_status: string | null; sub_plan: string | null; active_days_90d: Num | null; last_day: string | null }[];
  subscribers: { email: string | null; user_id: string; plan: string; status: string; cancel_at_period_end: boolean; current_period_end: string | null; created_at: string }[];
  health: { tables: Record<string, Num>; oldest_ai_usage_log: string | null; cache_empty_share: Num | null; cron: { jobname: string; status: string; start_time: string; end_time: string | null; message: string | null }[] | null };
  revenue: { pro: Num; monthly: Num; yearly: Num; cancelling: Num; mrr: Num; mrrGross: Num };
  config: { liveCheckDailyBudgetUsd: Num; legacyDailyBudgetUsd: Num; prices: { monthly: Num; yearly: Num } };
}

const RANGES = [7, 30, 90, 365];
const PLAN_SERIES: Series[] = [
  { key: 'anon', label: 'Anonymous', color: 'var(--s1)' },
  { key: 'free', label: 'Free account', color: 'var(--s2)' },
  { key: 'pro', label: 'Pro', color: 'var(--s3)' },
];
/** Fixed model → slot order so a model keeps its color whatever the range shows. */
const MODEL_ORDER = ['gpt-4o-mini', 'gpt-5-mini', 'gpt-6-luna'];
const SLOTS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

const pct = (a: number, b: number) => (b > 0 ? (100 * a) / b : NaN);
const fmtPct = (v: number, digits = 0) => (Number.isFinite(v) ? `${v.toFixed(digits)}%` : '–');
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '–');
const shortId = (id: string) => (id.length > 22 ? id.slice(0, 22) + '…' : id);

async function getToken(): Promise<string | null> {
  const { data } = await createSupabaseBrowser().auth.getSession();
  return data.session?.access_token ?? null;
}

async function adminFetch<T>(path: string): Promise<{ status: number; body: T | null }> {
  const token = await getToken();
  if (!token) return { status: 404, body: null };
  const r = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  return { status: r.status, body: r.ok || r.status === 500 ? ((await r.json()) as T) : null };
}

export default function AdminPage() {
  const [state, setState] = useState<'checking' | 'denied' | 'ok'>('checking');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookup, setLookup] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const { status, body } = await adminFetch<Dashboard & { error?: string }>(`/api/admin/metrics?days=${d}`);
      if (status === 404) {
        setState('denied');
        return;
      }
      if (status !== 200 || !body) {
        setError(body?.error ?? `Request failed (${status})`);
        setState('ok');
        return;
      }
      setData(body);
      setState('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const robots = (
    <Head>
      <meta name="robots" content="noindex, nofollow, noarchive" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Head>
  );
  if (state === 'denied') return <>{robots}<Custom404 /></>;
  // Nothing that names the page until the API has confirmed an admin (the server-rendered HTML is this blank state).
  if (state === 'checking') return robots;

  return (
    <>
      {robots}
      <Head>
        <title>Admin · Rewordly</title>
      </Head>
      <AdminStyles />
      <div className="adm">
        {(
          <div className="adm-wrap">
            <header className="adm-top">
              <div>
                <h1>Rewordly admin</h1>
                <p className="adm-muted">
                  {data ? `${data.from} → ${data.today} (UTC) · updated ${new Date(data.generated_at).toLocaleTimeString()}` : ' '}
                </p>
              </div>
              <div className="adm-controls">
                <div className="adm-seg" role="radiogroup" aria-label="Period">
                  {RANGES.map((r) => (
                    <button key={r} role="radio" aria-checked={days === r} className={days === r ? 'on' : ''} onClick={() => setDays(r)}>
                      {r === 365 ? '1y' : `${r}d`}
                    </button>
                  ))}
                </div>
                <button className="adm-btn" onClick={() => load(days)} disabled={loading}>
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </header>

            {error && <div className="adm-error">{error}</div>}
            {data && <Body data={data} onUser={setLookup} />}
            <UserLookup query={lookup} onQuery={setLookup} />
          </div>
        )}
      </div>
    </>
  );
}

function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null;
  if (prev === 0) return <span className="adm-delta">{cur === 0 ? 'no change' : 'new'}</span>;
  const d = ((cur - prev) / prev) * 100;
  const good = invert ? d < 0 : d > 0;
  const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '';
  return (
    <span className={`adm-delta ${d === 0 ? '' : good ? 'up' : 'down'}`} title="vs the period before">
      {arrow} {Math.abs(d).toFixed(0)}%
    </span>
  );
}

function Tile({ label, value, hint, children, spark, sparkColor }: { label: string; value: ReactNode; hint?: string; children?: ReactNode; spark?: number[]; sparkColor?: string }) {
  return (
    <div className="adm-tile" title={hint}>
      <div className="adm-tile-label">{label}</div>
      <div className="adm-tile-value">{value}</div>
      <div className="adm-tile-foot">
        {children}
        {spark && <Spark values={spark} color={sparkColor} />}
      </div>
    </div>
  );
}

function Card({ title, sub, children, table }: { title: string; sub?: string; children: ReactNode; table?: ReactNode }) {
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {sub && <p className="adm-sub">{sub}</p>}
      {children}
      {table && (
        <details className="adm-details">
          <summary>Show as table</summary>
          {table}
        </details>
      )}
    </section>
  );
}

function DailyTable({ rows, cols }: { rows: Row[]; cols: { key: string; label: string; fmt?: (v: number) => string }[] }) {
  return (
    <div className="adm-scroll">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Day</th>
            {cols.map((c) => (
              <th key={c.key} className="num">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={String(r.day)}>
              <td>{String(r.day)}</td>
              {cols.map((c) => (
                <td key={c.key} className="num">{(c.fmt ?? fmtNum)(Number(r[c.key] ?? 0))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Body({ data, onUser }: { data: Dashboard; onUser: (q: string) => void }) {
  const { cur, prev } = data.kpis;
  const daily = data.daily;
  const series = (k: keyof Daily) => daily.map((d) => Number(d[k] ?? 0));
  const activeSeries = daily.map((d) => d.anon + d.free + d.pro);

  const models = useMemo(() => {
    const seen = new Set<string>();
    daily.forEach((d) => Object.keys(d.cost_by_model).forEach((m) => seen.add(m)));
    const ordered = [...MODEL_ORDER.filter((m) => seen.has(m)), ...Array.from(seen).filter((m) => !MODEL_ORDER.includes(m)).sort()];
    return ordered.map((m) => ({ key: m, label: m, color: SLOTS[(MODEL_ORDER.includes(m) ? MODEL_ORDER.indexOf(m) : MODEL_ORDER.length + ordered.indexOf(m)) % SLOTS.length] }));
  }, [daily]);
  const costRows: Row[] = daily.map((d) => ({ day: d.day, ...d.cost_by_model }));

  const costPerUser = cur.active_users ? cur.ai_cost / cur.active_users : NaN;
  const costPerUserPrev = prev.active_users ? prev.ai_cost / prev.active_users : NaN;
  const fixRate = pct(cur.fixes, cur.live_checks);
  const fixRatePrev = pct(prev.fixes, prev.live_checks);
  const stickiness = pct(data.now.dau, data.now.mau);
  const budget = data.config.liveCheckDailyBudgetUsd;
  const cacheSaving = cur.live_chars > 0 ? 100 * (1 - cur.model_chars / cur.live_chars) : NaN;
  const margin = data.revenue.mrrGross > 0 ? 100 * (1 - data.now.cost_30d / data.revenue.mrrGross) : NaN;

  return (
    <>
      <h3 className="adm-h">Right now</h3>
      <div className="adm-tiles">
        <Tile label="Active today" value={fmtNum(data.now.dau)} hint="Distinct people (identities) seen today, UTC">
          <Delta cur={data.now.dau} prev={data.now.dau_yesterday} /> <span className="adm-muted">vs yesterday ({data.now.dau_yesterday})</span>
        </Tile>
        <Tile label="Active 7 days" value={fmtNum(data.now.wau)} />
        <Tile label="Active 30 days" value={fmtNum(data.now.mau)} />
        <Tile label="Stickiness" value={fmtPct(stickiness)} hint="Active today ÷ active in the last 30 days">
          <span className="adm-muted">DAU / MAU</span>
        </Tile>
        <Tile label="Live check spend today" value={fmtUsd(data.now.live_cost_today)} hint="Live checks pause for non-Pro users when this reaches the daily budget">
          <div className="adm-grow">
            <Meter value={data.now.live_cost_today} max={budget} />
            <span className="adm-muted">of {fmtUsd(budget)} budget</span>
          </div>
        </Tile>
        <Tile label="MRR" value={fmtUsd(data.revenue.mrr)} hint="Renewing plans; yearly counted as a twelfth">
          <span className="adm-muted">
            {data.revenue.pro} Pro · {data.revenue.cancelling} cancelling · paying now {fmtUsd(data.revenue.mrrGross)}
          </span>
        </Tile>
      </div>

      <h3 className="adm-h">Last {data.days} days <span className="adm-muted">· change vs the {data.days} days before</span></h3>
      <div className="adm-tiles">
        <Tile label="Active users" value={fmtNum(cur.active_users)} spark={activeSeries}>
          <Delta cur={cur.active_users} prev={prev.active_users} />
        </Tile>
        <Tile label="New users" value={fmtNum(cur.new_users)} hint="First seen in this period" spark={series('new_users')}>
          <Delta cur={cur.new_users} prev={prev.new_users} />
        </Tile>
        <Tile label="Returning" value={fmtPct(pct(cur.returning_users, cur.active_users))} hint="Share of active users seen on 2+ days">
          <span className="adm-muted">{fmtNum(cur.returning_users)} people</span>
        </Tile>
        <Tile label="Sign-ups" value={fmtNum(cur.signups)} spark={series('signups')}>
          <Delta cur={cur.signups} prev={prev.signups} /> <span className="adm-muted">{fmtNum(data.now.accounts)} accounts</span>
        </Tile>
        <Tile label="Live checks" value={fmtNum(cur.live_checks)} hint="Check requests sent by extension 1.8.0+" spark={series('live_checks')}>
          <Delta cur={cur.live_checks} prev={prev.live_checks} /> <span className="adm-muted">{fmtNum(cur.live_users)} people</span>
        </Tile>
        <Tile label="Fixes applied" value={fmtNum(cur.fixes)} spark={series('fixes')} sparkColor="var(--s2)">
          <Delta cur={cur.fixes} prev={prev.fixes} /> <span className="adm-muted">{fmtNum(cur.fix_users)} people</span>
        </Tile>
        <Tile label="Fixes per check" value={fmtPct(fixRate, 1)} hint="Applied fixes ÷ live check requests">
          <Delta cur={fixRate} prev={fixRatePrev} />
        </Tile>
        <Tile label="Rewrites + grammar" value={fmtNum(cur.rewrites + cur.grammar)} hint="All extension versions (server counters)" spark={daily.map((d) => d.rewrites + d.grammar)}>
          <Delta cur={cur.rewrites + cur.grammar} prev={prev.rewrites + prev.grammar} />
        </Tile>
        <Tile label="Hit a limit" value={fmtNum(cur.limit_users)} hint="People who were stopped by a plan limit at least once">
          <span className="adm-muted">{fmtNum(cur.limit_events)} times</span>
        </Tile>
        <Tile label="Turned live check off" value={fmtNum(cur.live_off_users)} hint="People who switched the live check off in the popup (extension newer than 1.8.0)">
          <Delta cur={cur.live_off_users} prev={prev.live_off_users} invert /> <span className="adm-muted">{fmtNum(cur.live_off)} times</span>
        </Tile>
        <Tile label="Turned a site off" value={fmtNum(cur.site_disable_users)} hint="People who used “Disable Rewordly on this page” (extension newer than 1.8.0)">
          <Delta cur={cur.site_disable_users} prev={prev.site_disable_users} invert /> <span className="adm-muted">{fmtNum(cur.site_disables)} times</span>
        </Tile>
        <Tile label="AI spend" value={fmtUsd(cur.ai_cost)} spark={series('cost')}>
          <Delta cur={cur.ai_cost} prev={prev.ai_cost} invert />
        </Tile>
        <Tile label="Spend per active user" value={fmtUsd(costPerUser)}>
          <Delta cur={costPerUser} prev={costPerUserPrev} invert />
        </Tile>
        <Tile label="Gross margin (30d)" value={fmtPct(margin)} hint="1 − AI spend in the last 30 days ÷ what Pro users pay per month">
          <span className="adm-muted">{fmtUsd(data.now.cost_30d)} AI vs {fmtUsd(data.revenue.mrrGross)}</span>
        </Tile>
      </div>

      <div className="adm-grid2">
        <Card title="Active users per day" sub="By plan today. Anyone who used the extension that day."
          table={<DailyTable rows={daily as unknown as Row[]} cols={[{ key: 'anon', label: 'Anonymous' }, { key: 'free', label: 'Free' }, { key: 'pro', label: 'Pro' }, { key: 'new_users', label: 'New' }]} />}>
          <StackedColumns rows={daily as unknown as Row[]} series={PLAN_SERIES} />
        </Card>
        <Card title="AI spend per day" sub="OpenAI cost by model, all features."
          table={<DailyTable rows={costRows} cols={models.map((m) => ({ key: m.key, label: m.label, fmt: fmtUsd }))} />}>
          <StackedColumns rows={costRows} series={models} format={fmtUsd} integer={false} />
        </Card>
        <Card title="Live checks and fixes" sub="Requests sent by the extension, and suggestions people applied."
          table={<DailyTable rows={daily as unknown as Row[]} cols={[{ key: 'live_checks', label: 'Checks' }, { key: 'fixes', label: 'Fixes' }, { key: 'ignores', label: 'Ignores' }]} />}>
          <Lines rows={daily as unknown as Row[]} series={[
            { key: 'live_checks', label: 'Checks', color: 'var(--s1)' },
            { key: 'fixes', label: 'Fixes', color: 'var(--s2)' },
            { key: 'ignores', label: 'Ignores', color: 'var(--s3)' },
          ]} />
        </Card>
        <Card title="Rewrites and grammar checks" sub="Server counters, every extension version."
          table={<DailyTable rows={daily as unknown as Row[]} cols={[{ key: 'rewrites', label: 'Rewrites' }, { key: 'grammar', label: 'Grammar' }]} />}>
          <Lines rows={daily as unknown as Row[]} series={[
            { key: 'rewrites', label: 'Rewrites', color: 'var(--s1)' },
            { key: 'grammar', label: 'Grammar', color: 'var(--s2)' },
          ]} />
        </Card>
        <Card title="New users and sign-ups" sub="New = first time an identity shows up. Sign-up = new account."
          table={<DailyTable rows={daily as unknown as Row[]} cols={[{ key: 'new_users', label: 'New users' }, { key: 'signups', label: 'Sign-ups' }]} />}>
          <Lines rows={daily as unknown as Row[]} series={[
            { key: 'new_users', label: 'New users', color: 'var(--s1)' },
            { key: 'signups', label: 'Sign-ups', color: 'var(--s2)' },
          ]} />
        </Card>
        <Card title="Limit hits per day" sub="People stopped by a plan limit (live check, rewrite or grammar)."
          table={<DailyTable rows={daily as unknown as Row[]} cols={[{ key: 'limit_users', label: 'People' }, { key: 'limit_events', label: 'Times' }]} />}>
          <Lines rows={daily as unknown as Row[]} series={[
            { key: 'limit_users', label: 'People', color: 'var(--s1)' },
            { key: 'limit_events', label: 'Times', color: 'var(--s2)' },
          ]} />
        </Card>
      </div>

      <div className="adm-grid3">
        <Card title="Anonymous trial" sub="15,000 free characters, all time. How far people get.">
          <HBars
            items={[
              { label: 'Started', value: data.trial.started },
              { label: 'Over 1,000 chars', value: data.trial.over_1k },
              { label: 'Over half', value: data.trial.over_half },
              { label: 'Used it all', value: data.trial.used_up },
            ]}
            note={(v) => fmtPct(pct(v, data.trial.started))}
          />
          <div className="adm-kv">
            <span>Accounts</span><b>{fmtNum(data.now.accounts)}</b>
            <span>Pro now</span><b>{fmtNum(data.revenue.pro)} ({fmtPct(pct(data.revenue.pro, data.now.accounts), 1)} of accounts)</b>
          </div>
        </Card>
        <Card title="Where the money goes" sub={`Last ${Math.min(data.days, 90)} days of the raw log.`}>
          <p className="adm-label">By plan</p>
          <HBars format={fmtUsd}
            items={Object.entries(data.cost_split.by_tier).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v }))} />
          <p className="adm-label">By feature</p>
          <HBars format={fmtUsd}
            items={Object.entries(data.cost_split.by_feature).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v }))} />
          <div className="adm-kv">
            {Object.entries(data.cost_split.by_model).map(([m, v]) => (
              <FragmentKV key={m} k={m} v={`${fmtNum(v.calls)} calls · ${fmtUsd(v.cost)} · ${fmtUsd(v.calls ? v.cost / v.calls : 0)}/call`} />
            ))}
            <FragmentKV k="Per 1,000 chars checked" v={fmtUsd(cur.live_chars ? (cur.ai_cost / cur.live_chars) * 1000 : NaN)} />
            <FragmentKV k="Server cache saving" v={`${fmtPct(cacheSaving)} of characters never reached the model`} />
          </div>
        </Card>
        <Card title="Extension versions" sub="Last 7 days. Older versions only show up through rewrite/grammar use.">
          <HBars color="var(--s7)" items={data.versions.map((v) => ({ label: v.version, value: v.users }))} />
        </Card>
      </div>

      <Card title="Do people come back?" sub="Grouped by the first day someone was seen. D1 = came back the next day, D7 = within 7 days, Any = on any later day.">
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr><th>First day</th><th className="num">People</th><th className="num">D1</th><th className="num">D7</th><th className="num">Any</th></tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.first_day}>
                  <td>{c.first_day}</td>
                  <td className="num">{c.size}</td>
                  <CohortCell n={c.d1} size={c.size} />
                  <CohortCell n={c.d7} size={c.size} />
                  <CohortCell n={c.any} size={c.size} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Sites" sub="Where people use Rewordly, by number of people.">
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Site</th><th className="num">People</th><th className="num">Checks</th><th className="num">Fixes</th>
                <th className="num">Fix rate</th><th className="num">Ignores</th><th className="num">Rewrites</th><th className="num">Grammar</th>
                <th className="num">Limit hits</th><th className="num">AI spend</th>
              </tr>
            </thead>
            <tbody>
              {data.sites.map((s) => (
                <tr key={s.host}>
                  <td>{s.host}</td><td className="num">{s.users}</td><td className="num">{fmtNum(s.live_checks)}</td>
                  <td className="num">{fmtNum(s.fixes)}</td><td className="num">{fmtPct(pct(s.fixes, s.live_checks), 1)}</td>
                  <td className="num">{fmtNum(s.ignores)}</td><td className="num">{fmtNum(s.rewrites)}</td><td className="num">{fmtNum(s.grammar)}</td>
                  <td className="num">{fmtNum(s.limit_events)}</td><td className="num">{fmtUsd(s.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Turned off" sub="Where people turn Rewordly off. Live check switches are listed under the tab the popup was opened on; “none” means no website was open.">
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Site</th><th className="num">People</th><th className="num">Site off</th><th className="num">Site on again</th>
                <th className="num">Live check off</th><th className="num">Live check on again</th>
              </tr>
            </thead>
            <tbody>
              {(data.turned_off ?? []).length === 0 && (
                <tr><td colSpan={6} className="adm-muted">Nothing yet (needs an extension newer than 1.8.0).</td></tr>
              )}
              {(data.turned_off ?? []).map((t) => (
                <tr key={t.host}>
                  <td>{t.host}</td><td className="num">{t.users}</td><td className="num">{fmtNum(t.site_disables)}</td>
                  <td className="num">{fmtNum(t.site_enables)}</td><td className="num">{fmtNum(t.live_off)}</td><td className="num">{fmtNum(t.live_on)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <PeopleTabs data={data} onUser={onUser} />
      <Health data={data} />
    </>
  );
}

function FragmentKV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span>{k}</span>
      <b>{v}</b>
    </>
  );
}

function CohortCell({ n, size }: { n: number | null; size: number }) {
  if (n === null) return <td className="num adm-muted">–</td>;
  const p = size ? n / size : 0;
  return (
    <td className="num adm-heat" style={{ ['--p' as string]: String(p) }}>
      {fmtPct(p * 100)} <small>({n})</small>
    </td>
  );
}

function Who({ identity, email, onUser }: { identity: string; email: string | null; onUser: (q: string) => void }) {
  return (
    <button className="adm-link" onClick={() => onUser(email ?? identity)} title={identity}>
      {email ?? shortId(identity)}
    </button>
  );
}

function PeopleTabs({ data, onUser }: { data: Dashboard; onUser: (q: string) => void }) {
  const [tab, setTab] = useState<'top' | 'limits' | 'signups' | 'subs'>('top');
  const [all, setAll] = useState(false);
  const cap = <T,>(rows: T[]) => (all ? rows : rows.slice(0, 25));
  const tabs: [typeof tab, string][] = [
    ['top', `Most active (${data.top_users.length})`],
    ['limits', `Hit a limit (${data.limit_hits.length})`],
    ['signups', 'Newest accounts'],
    ['subs', `Subscribers (${data.subscribers.length})`],
  ];
  return (
    <section className="adm-card">
      <h2>People</h2>
      <p className="adm-sub">Click a person to see everything about them below.</p>
      <div className="adm-seg adm-tabs" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="adm-scroll">
        {tab === 'top' && (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Who</th><th>Plan</th><th className="num">Days</th><th className="num">Checks</th><th className="num">Chars</th>
                <th className="num">Fixes</th><th className="num">Rewrites</th><th className="num">Grammar</th><th className="num">Limits</th>
                <th className="num">Trial used</th><th className="num">AI spend</th><th>First seen</th><th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {cap(data.top_users).map((u) => (
                <tr key={u.identity}>
                  <td><Who identity={u.identity} email={u.email} onUser={onUser} /></td>
                  <td><Plan plan={u.plan} /></td>
                  <td className="num">{u.days}</td><td className="num">{fmtNum(u.live_checks)}</td><td className="num">{fmtNum(u.live_chars)}</td>
                  <td className="num">{fmtNum(u.fixes)}</td><td className="num">{fmtNum(u.rewrites)}</td><td className="num">{fmtNum(u.grammar)}</td>
                  <td className="num">{fmtNum(u.limit_events)}</td>
                  <td className="num">{u.trial_chars === null ? '–' : fmtPct(pct(u.trial_chars, 15000))}</td>
                  <td className="num">{fmtUsd(u.cost)}</td><td>{day(u.first_day)}</td><td>{day(u.last_day)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'limits' && (
          <table className="adm-table">
            <thead><tr><th>Who</th><th>Plan</th><th>Limits hit</th><th>Last</th></tr></thead>
            <tbody>
              {cap(data.limit_hits).map((u) => (
                <tr key={u.identity}>
                  <td><Who identity={u.identity} email={u.email} onUser={onUser} /></td>
                  <td><Plan plan={u.plan} /></td>
                  <td>{Object.entries(u.events).map(([e, n]) => `${e.replace('_limit', '')} ×${n}`).join(', ')}</td>
                  <td>{u.last_day}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'signups' && (
          <table className="adm-table">
            <thead><tr><th>Email</th><th>Created</th><th>Last sign-in</th><th>Subscription</th><th className="num">Active days (90d)</th><th>Last seen</th></tr></thead>
            <tbody>
              {cap(data.signups).map((u) => (
                <tr key={u.id}>
                  <td><Who identity={`user:${u.id}`} email={u.email} onUser={onUser} /></td>
                  <td>{day(u.created_at)}</td><td>{day(u.last_sign_in_at)}</td>
                  <td>{u.sub_status ? `${u.sub_plan ?? ''} ${u.sub_status}` : '–'}</td>
                  <td className="num">{u.active_days_90d ?? 0}</td><td>{day(u.last_day)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'subs' && (
          <table className="adm-table">
            <thead><tr><th>Email</th><th>Plan</th><th>Status</th><th>Renews</th><th>Period ends</th><th>Since</th></tr></thead>
            <tbody>
              {data.subscribers.map((s) => (
                <tr key={s.user_id}>
                  <td><Who identity={`user:${s.user_id}`} email={s.email} onUser={onUser} /></td>
                  <td>{s.plan}</td><td>{s.status}</td>
                  <td>{s.status === 'active' && !s.cancel_at_period_end ? 'yes' : 'no'}</td>
                  <td>{day(s.current_period_end)}</td><td>{day(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!all && ((tab === 'top' && data.top_users.length > 25) || (tab === 'limits' && data.limit_hits.length > 25) || (tab === 'signups' && data.signups.length > 25)) && (
        <button className="adm-btn adm-more" onClick={() => setAll(true)}>Show all</button>
      )}
    </section>
  );
}

function Plan({ plan }: { plan: string }) {
  return <span className={`adm-pill adm-pill-${plan}`}>{plan}</span>;
}

function Health({ data }: { data: Dashboard }) {
  const h = data.health;
  const lastRun = h.cron?.[0];
  return (
    <section className="adm-card">
      <h2>Data health</h2>
      <p className="adm-sub">Row counts, the daily cleanup job (supabase-retention.sql) and the shared result cache.</p>
      <div className="adm-grid2">
        <div className="adm-kv">
          {Object.entries(h.tables).sort(([a], [b]) => a.localeCompare(b)).map(([t, n]) => (
            <FragmentKV key={t} k={t} v={fmtNum(n)} />
          ))}
        </div>
        <div className="adm-kv">
          <FragmentKV k="Oldest ai_usage_log row" v={day(h.oldest_ai_usage_log)} />
          <FragmentKV k="Cache rows with no issues" v={fmtPct((h.cache_empty_share ?? NaN) * 100)} />
          <FragmentKV k="Live check budget / day" v={fmtUsd(data.config.liveCheckDailyBudgetUsd)} />
          <FragmentKV k="Rewrite + grammar budget / day" v={fmtUsd(data.config.legacyDailyBudgetUsd)} />
          <span>Cleanup job</span>
          <b>
            {h.cron === null ? 'cannot read cron (pg_cron off?)' : lastRun ? (
              <span className={lastRun.status === 'succeeded' ? 'adm-ok' : 'adm-bad'}>
                {lastRun.status === 'succeeded' ? '✓' : '✕'} {lastRun.jobname} {lastRun.status} {new Date(lastRun.start_time).toLocaleString()}
              </span>
            ) : 'no runs yet'}
          </b>
          {lastRun?.message && (<><span>Last result</span><b className="adm-mono">{lastRun.message}</b></>)}
        </div>
      </div>
    </section>
  );
}

interface UserData {
  identity: string;
  account: { id: string; email: string; created_at: string; last_sign_in_at: string | null } | null;
  subscription: Record<string, unknown> | null;
  quota: { period: string; chars: number; updated_at: string }[];
  usage: { date: string; rewrites: number; grammar: number }[];
  events: { day: string; host: string; event: string; count: number; chars: number; version: string | null; tier: string }[];
  cost_daily: { day: string; calls: number; cost: number; chars: number }[];
}

function UserLookup({ query, onQuery }: { query: string | null; onQuery: (q: string) => void }) {
  const [input, setInput] = useState('');
  const [user, setUser] = useState<UserData | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!query) return;
    setInput(query);
    setBusy(true);
    adminFetch<{ user: UserData | null }>(`/api/admin/user?q=${encodeURIComponent(query)}`)
      .then(({ body }) => setUser(body?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => {
        setBusy(false);
        requestAnimationFrame(() => document.getElementById('adm-lookup')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      });
  }, [query]);

  const totals = user
    ? {
        cost: user.cost_daily.reduce((s, d) => s + Number(d.cost), 0),
        checks: user.events.filter((e) => e.event === 'live_check').reduce((s, e) => s + e.count, 0),
        fixes: user.events.filter((e) => e.event === 'live_fix').reduce((s, e) => s + e.count, 0),
        rewrites: user.usage.reduce((s, u) => s + u.rewrites, 0),
        grammar: user.usage.reduce((s, u) => s + u.grammar, 0),
      }
    : null;

  return (
    <section className="adm-card" id="adm-lookup">
      <h2>Look up a person</h2>
      <p className="adm-sub">Email, user id, user:… or anon:… identity.</p>
      <form className="adm-search" onSubmit={(e) => { e.preventDefault(); if (input.trim()) onQuery(input.trim()); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="name@example.com or anon:…" aria-label="Person" />
        <button className="adm-btn" disabled={busy}>{busy ? 'Looking…' : 'Look up'}</button>
      </form>
      {user === null && <p className="adm-muted">Nothing found.</p>}
      {user && totals && (
        <div className="adm-user">
          <div className="adm-kv">
            <FragmentKV k="Identity" v={user.identity} />
            {user.account && (<>
              <FragmentKV k="Email" v={user.account.email} />
              <FragmentKV k="Account created" v={day(user.account.created_at)} />
              <FragmentKV k="Last sign-in" v={day(user.account.last_sign_in_at)} />
            </>)}
            <FragmentKV k="Subscription" v={user.subscription ? `${user.subscription.plan ?? ''} ${user.subscription.status ?? ''}${user.subscription.cancel_at_period_end ? ' (not renewing)' : ''}, ends ${day(user.subscription.current_period_end as string)}` : 'none'} />
            <FragmentKV k="Totals (kept history)" v={`${fmtNum(totals.checks)} checks · ${fmtNum(totals.fixes)} fixes · ${fmtNum(totals.rewrites)} rewrites · ${fmtNum(totals.grammar)} grammar · ${fmtUsd(totals.cost)} AI`} />
            <FragmentKV k="Live check quota" v={user.quota.slice(0, 6).map((q) => `${q.period}: ${fmtNum(q.chars)}`).join(' · ') || '–'} />
          </div>
          <div className="adm-grid2">
            <div className="adm-scroll adm-tall">
              <table className="adm-table">
                <thead><tr><th>Day</th><th>Site</th><th>Event</th><th className="num">Count</th><th className="num">Chars</th><th>Version</th></tr></thead>
                <tbody>
                  {user.events.map((e, i) => (
                    <tr key={i}><td>{e.day}</td><td>{e.host}</td><td>{e.event}</td><td className="num">{e.count}</td><td className="num">{fmtNum(e.chars)}</td><td>{e.version ?? '–'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-scroll adm-tall">
              <table className="adm-table">
                <thead><tr><th>Day</th><th className="num">Rewrites</th><th className="num">Grammar</th><th className="num">Model calls</th><th className="num">AI spend</th></tr></thead>
                <tbody>
                  {mergeDays(user).map((d) => (
                    <tr key={d.day}><td>{d.day}</td><td className="num">{d.rewrites}</td><td className="num">{d.grammar}</td><td className="num">{d.calls}</td><td className="num">{fmtUsd(d.cost)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function mergeDays(u: UserData) {
  const m = new Map<string, { day: string; rewrites: number; grammar: number; calls: number; cost: number }>();
  const get = (d: string) => m.get(d) ?? m.set(d, { day: d, rewrites: 0, grammar: 0, calls: 0, cost: 0 }).get(d)!;
  u.usage.forEach((x) => Object.assign(get(x.date), { rewrites: x.rewrites, grammar: x.grammar }));
  u.cost_daily.forEach((x) => Object.assign(get(x.day), { calls: x.calls, cost: Number(x.cost) }));
  return Array.from(m.values()).sort((a, b) => b.day.localeCompare(a.day));
}
