import { getSupabaseAdmin } from './supabase';
import type { LimitTier } from './limits';

/**
 * Per-site feature usage reported by the extension (POST /api/events).
 * Storage: table site_usage + function add_site_usage (supabase-site-usage.sql).
 */

/** Events the extension may report. Anything else is dropped. */
export const EVENTS = [
  'live_check', //      a live check request left the device (chars = characters sent)
  'live_fix', //        a suggestion applied (count = fixes, Fix all included)
  'live_fix_all', //    "Fix all" used
  'live_ignore', //     "Ignore"
  'live_ignore_always', // "Always ignore"
  'live_dictionary', // "Add to dictionary"
  'live_badge', //      badge clicked
  'live_limit', //      checking stopped by the plan limit
  'rewrite', //         rewrite done (floating button, context menu, shortcut)
  'rewrite_limit', //   rewrite refused by the plan limit
  'grammar', //         selection grammar check done
  'grammar_limit', //   grammar check refused by the plan limit
] as const;
export type UsageEventName = (typeof EVENTS)[number];

const EVENT_SET = new Set<string>(EVENTS);
const MAX_ROWS = 100;
/** Generous per batch (the extension sends about once a minute); stops a broken client inflating numbers. */
const MAX_COUNT = 1000;
const MAX_CHARS = 1_000_000;

const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const PRIVATE_SUFFIXES = ['.local', '.localhost', '.internal', '.intranet', '.lan', '.home', '.corp', '.test', '.example', '.invalid'];

/**
 * Hostname as stored: lowercase, without "www.". Intranet and local hosts become 'private' so
 * company-internal names are never recorded; anything that is not a plain hostname is rejected.
 */
export function normalizeHost(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let host = input.trim().toLowerCase().replace(/\.$/, '');
  if (!host || host.length > 253) return null;
  if (host === 'private') return host;
  if (/[\s/@;'"]/.test(host)) return null;
  if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[[0-9a-f:.]+\]$/.test(host)) return 'private';
  if (!host.includes('.') || PRIVATE_SUFFIXES.some((s) => host.endsWith(s))) return 'private';
  if (!HOSTNAME.test(host)) return null;
  if (host.startsWith('www.')) host = host.slice(4);
  return host;
}

export interface UsageRow {
  host: string;
  event: UsageEventName;
  count: number;
  chars: number;
}

/** Validates a client batch and merges duplicates (one row per host + event). */
export function parseUsageRows(body: unknown): UsageRow[] {
  const events = (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) return [];
  const merged = new Map<string, UsageRow>();
  for (const raw of events.slice(0, MAX_ROWS)) {
    const { host, event, count, chars } = (raw ?? {}) as Record<string, unknown>;
    const h = normalizeHost(host);
    if (!h || typeof event !== 'string' || !EVENT_SET.has(event)) continue;
    const n = clampInt(count, 1, MAX_COUNT);
    const c = clampInt(chars, 0, MAX_CHARS);
    if (n === null) continue;
    const key = `${h}\t${event}`;
    const row = merged.get(key) ?? { host: h, event: event as UsageEventName, count: 0, chars: 0 };
    row.count = Math.min(MAX_COUNT, row.count + n);
    row.chars = Math.min(MAX_CHARS, row.chars + (c ?? 0));
    merged.set(key, row);
  }
  return Array.from(merged.values());
}

function clampInt(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null) return min;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function recordSiteUsage(identity: string, tier: LimitTier, version: string | null, rows: UsageRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await getSupabaseAdmin().rpc('add_site_usage', {
    p_identity: identity,
    p_tier: tier,
    p_version: version,
    p_rows: rows,
  });
  if (error) console.error('add_site_usage failed (has supabase-site-usage.sql been run?):', error.message);
}
