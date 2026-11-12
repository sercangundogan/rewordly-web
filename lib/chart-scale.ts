/** Y-axis scale for the admin dashboard charts (components/admin/charts.tsx). */

/** Axis top and step: a clean step (1, 2, 5 × 10^n) and about 5 ticks. Counts never get fractional steps. */
export function niceScale(v: number, integer = true): { max: number; step: number } {
  if (!(v > 0)) return { max: integer ? 4 : 1, step: integer ? 1 : 0.25 };
  const raw = v / 5;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  let step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 && !integer ? 2.5 : f <= 5 ? 5 : 10) * exp;
  if (integer) step = Math.max(1, Math.round(step));
  return { max: Math.ceil(v / step - 1e-9) * step, step };
}
