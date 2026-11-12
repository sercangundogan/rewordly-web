import { useEffect, useRef, useState, type ReactNode } from 'react';
import { niceScale } from '../../lib/chart-scale';

/**
 * Small SVG charts for the admin dashboard. No chart library: the page is private and these
 * cover what it needs (stacked columns, lines, horizontal bars, sparklines), each with a hover tooltip.
 * Colors come from CSS variables defined in pages/admin.tsx (--s1.. categorical slots, fixed order).
 */

export interface Series {
  key: string;
  label: string;
  /** CSS color, normally var(--sN). Follows the entity, never its rank. */
  color: string;
}

export type Row = Record<string, number | string>;

const H = 220;
const PAD = { top: 12, right: 12, bottom: 26, left: 44 };

export function fmtNum(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '–';
  if (Math.abs(v) >= 10_000) return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  return v.toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function fmtUsd(v: number): string {
  if (!Number.isFinite(v)) return '–';
  if (v !== 0 && Math.abs(v) < 0.01) return '$' + Number(v.toPrecision(2));
  return '$' + v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortDay(day: string): string {
  const d = new Date(day + 'T00:00:00Z');
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  // ResizeObserver keeps the SVG at the card width.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.floor(entries[0].contentRect.width);
      if (cw > 0) setW(cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="adm-legend">
      {series.map((s) => (
        <span key={s.key}>
          <i style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, width, title, rows }: { x: number; width: number; title: string; rows: [Series | null, string][] }) {
  const left = Math.max(0, x + 212 > width ? x - 200 : x + 12);
  return (
    <div className="adm-tip" style={{ left }}>
      <b>{title}</b>
      {rows.map(([s, v], i) => (
        <div key={i}>
          {s && <i style={{ background: s.color }} />}
          <span>{s ? s.label : ''}</span>
          <em>{v}</em>
        </div>
      ))}
    </div>
  );
}

function YAxis({ max, step, width, format }: { max: number; step: number; width: number; format: (v: number) => string }) {
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  const ih = H - PAD.top - PAD.bottom;
  return (
    <g>
      {ticks.map((t, i) => {
        const y = PAD.top + ih - (t / max) * ih;
        return (
          <g key={i}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} className={i === 0 ? 'adm-base' : 'adm-grid'} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" className="adm-tick">
              {format(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XLabels({ rows, x, band }: { rows: Row[]; x: (i: number) => number; band: number }) {
  const every = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor((rows.length * band) / 64))));
  const last = rows.length - 1;
  // The last day always gets a label; the regular one before it is dropped when the two would touch.
  const show = (i: number) => i === last || (i % every === 0 && (last - i) * band >= 56);
  return (
    <g>
      {rows.map((r, i) =>
        show(i) ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="adm-tick">
            {shortDay(String(r.day))}
          </text>
        ) : null,
      )}
    </g>
  );
}

/** Stacked columns by day (e.g. active users by plan, AI spend by model). */
export function StackedColumns({
  rows,
  series,
  format = (v) => fmtNum(v),
  totalLabel = 'Total',
  integer = true,
}: {
  rows: Row[];
  series: Series[];
  format?: (v: number) => string;
  totalLabel?: string;
  /** false for money and other fractional values */
  integer?: boolean;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const totals = rows.map((r) => series.reduce((s, x) => s + Number(r[x.key] ?? 0), 0));
  const { max, step } = niceScale(Math.max(0, ...totals), integer);
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const band = iw / Math.max(rows.length, 1);
  const bw = Math.max(2, Math.min(24, band - 4));
  const x = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => (v / max) * ih;

  return (
    <div ref={ref} className="adm-chart">
      <Legend series={series} />
      <svg width={width} height={H} role="img" onMouseLeave={() => setHover(null)}>
        <YAxis max={max} step={step} width={width} format={format} />
        {rows.map((r, i) => {
          let acc = 0;
          const segs = series.filter((s) => Number(r[s.key] ?? 0) > 0);
          return (
            <g key={i}>
              {segs.map((s, j) => {
                const v = Number(r[s.key] ?? 0);
                const h = y(v);
                const top = PAD.top + ih - y(acc) - h;
                acc += v;
                const isTop = j === segs.length - 1;
                const gap = j > 0 ? 2 : 0; // 2px surface gap between stacked segments
                const hh = Math.max(0, h - gap);
                const rr = isTop ? Math.min(4, hh / 2, bw / 2) : 0;
                const x0 = x(i) - bw / 2;
                const path = rr
                  ? `M${x0},${top + hh} V${top + rr} Q${x0},${top} ${x0 + rr},${top} H${x0 + bw - rr} Q${x0 + bw},${top} ${x0 + bw},${top + rr} V${top + hh} Z`
                  : `M${x0},${top + hh} V${top} H${x0 + bw} V${top + hh} Z`;
                return <path key={s.key} d={path} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.55} />;
              })}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            </g>
          );
        })}
        <XLabels rows={rows} x={x} band={band} />
      </svg>
      {hover !== null && rows[hover] && (
        <Tooltip
          x={x(hover)}
          width={width}
          title={shortDay(String(rows[hover].day))}
          rows={[
            ...series.map((s) => [s, format(Number(rows[hover][s.key] ?? 0))] as [Series, string]),
            [{ key: 't', label: totalLabel, color: 'transparent' }, format(totals[hover])],
          ]}
        />
      )}
    </div>
  );
}

/** Lines by day on one shared axis (same unit only). */
export function Lines({ rows, series, format = (v) => fmtNum(v), integer = true }: { rows: Row[]; series: Series[]; format?: (v: number) => string; integer?: boolean }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const { max, step: yStep } = niceScale(Math.max(0, ...rows.flatMap((r) => series.map((s) => Number(r[s.key] ?? 0)))), integer);
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const step = rows.length > 1 ? iw / (rows.length - 1) : 0;
  const x = (i: number) => (rows.length > 1 ? PAD.left + step * i : PAD.left + iw / 2);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const hitW = rows.length > 1 ? step : iw;

  return (
    <div ref={ref} className="adm-chart">
      <Legend series={series} />
      <svg width={width} height={H} role="img" onMouseLeave={() => setHover(null)}>
        <YAxis max={max} step={yStep} width={width} format={format} />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} className="adm-cross" />}
        {series.map((s) => {
          const d = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(Number(r[s.key] ?? 0))}`).join(' ');
          const last = rows.length - 1;
          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {last >= 0 && (
                <circle cx={x(last)} cy={y(Number(rows[last][s.key] ?? 0))} r={4} fill={s.color} className="adm-ring" />
              )}
              {hover !== null && (
                <circle cx={x(hover)} cy={y(Number(rows[hover][s.key] ?? 0))} r={4} fill={s.color} className="adm-ring" />
              )}
            </g>
          );
        })}
        {rows.map((_, i) => (
          <rect key={i} x={x(i) - hitW / 2} y={PAD.top} width={hitW} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        <XLabels rows={rows} x={x} band={rows.length > 1 ? step : iw} />
      </svg>
      {hover !== null && rows[hover] && (
        <Tooltip
          x={x(hover)}
          width={width}
          title={shortDay(String(rows[hover].day))}
          rows={series.map((s) => [s, format(Number(rows[hover][s.key] ?? 0))] as [Series, string])}
        />
      )}
    </div>
  );
}

/** Horizontal bars with the value at the tip (funnels, rankings). One series, one color. */
export function HBars({
  items,
  color = 'var(--s1)',
  format = (v) => fmtNum(v),
  note,
}: {
  items: { label: ReactNode; value: number; note?: string }[];
  color?: string;
  format?: (v: number) => string;
  note?: (v: number, i: number) => string | undefined;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="adm-hbars">
      {items.map((it, i) => (
        <div key={i} className="adm-hbar" title={`${format(it.value)}${it.note ? ' · ' + it.note : ''}`}>
          <span className="adm-hbar-label">{it.label}</span>
          <span className="adm-hbar-track">
            <span className="adm-hbar-fill" style={{ width: `${(it.value / max) * 100}%`, background: color }} />
          </span>
          <span className="adm-hbar-value">
            {format(it.value)}
            {(it.note ?? note?.(it.value, i)) && <small> {it.note ?? note?.(it.value, i)}</small>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tiny trend line for a KPI tile. */
export function Spark({ values, color = 'var(--s1)' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 4) + 2},${h - 3 - (v / max) * (h - 6)}`);
  return (
    <svg width={w} height={h} className="adm-spark" aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Progress against a limit (e.g. today's spend vs the daily budget). */
export function Meter({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const state = pct >= 0.9 ? 'critical' : pct >= 0.6 ? 'warning' : 'good';
  return (
    <div className="adm-meter" data-state={state}>
      <span style={{ width: `${pct * 100}%` }} />
    </div>
  );
}
