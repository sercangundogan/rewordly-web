/** Styles for pages/admin.tsx, scoped under .adm. Light and dark follow the OS setting. */
export function AdminStyles() {
  return (
    <style jsx global>{`
      .adm {
        --surface: #fcfcfb;
        --page: #f4f4f1;
        --ink: #0b0b0b;
        --ink-2: #52514e;
        --muted: #898781;
        --grid: #e1e0d9;
        --base: #c3c2b7;
        --border: rgba(11, 11, 11, 0.1);
        --up: #006300;
        --down: #d03b3b;
        --good: #0ca30c;
        --warning: #fab219;
        --critical: #d03b3b;
        --s1: #2a78d6;
        --s2: #eb6834;
        --s3: #1baf7a;
        --s4: #eda100;
        --s5: #e87ba4;
        --s6: #008300;
        --s7: #6250d6;
        --s8: #e34948;
        color-scheme: light;
        background: var(--page);
        color: var(--ink);
        min-height: 100vh;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        font-size: 14px;
      }
      @media (prefers-color-scheme: dark) {
        .adm {
          --surface: #1a1a19;
          --page: #0d0d0d;
          --ink: #f0efec;
          --ink-2: #c3c2b7;
          --muted: #898781;
          --grid: #2c2c2a;
          --base: #383835;
          --border: rgba(255, 255, 255, 0.1);
          --up: #0ca30c;
          --s1: #3987e5;
          --s2: #d95926;
          --s3: #199e70;
          --s4: #c98500;
          --s5: #d55181;
          --s6: #008300;
          --s7: #9085e9;
          --s8: #e66767;
          color-scheme: dark;
        }
      }
      .adm-wrap { max-width: 1320px; margin: 0 auto; padding: 24px 16px 64px; }
      .adm h1 { font-size: 22px; font-weight: 700; margin: 0; }
      .adm h2 { font-size: 15px; font-weight: 650; margin: 0 0 2px; }
      .adm-h { font-size: 13px; font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-2); margin: 28px 0 10px; }
      .adm-muted { color: var(--muted); font-weight: 400; text-transform: none; letter-spacing: 0; }
      .adm-sub { color: var(--muted); margin: 0 0 12px; font-size: 13px; }
      .adm-top { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-end; }
      .adm-top p { margin: 4px 0 0; font-size: 12px; }
      .adm-controls { display: flex; gap: 8px; align-items: center; }
      .adm-seg { display: inline-flex; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 3px; gap: 2px; flex-wrap: wrap; }
      .adm-seg button { border: 0; background: transparent; color: var(--ink-2); padding: 6px 12px; border-radius: 7px; cursor: pointer; font: inherit; }
      .adm-seg button:hover { background: var(--grid); }
      .adm-seg button.on { background: var(--ink); color: var(--surface); }
      .adm-btn { border: 1px solid var(--border); background: var(--surface); color: var(--ink); padding: 7px 14px; border-radius: 10px; cursor: pointer; font: inherit; }
      .adm-btn:disabled { opacity: 0.6; cursor: default; }
      .adm-error { margin-top: 16px; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--critical); color: var(--critical); background: var(--surface); }
      .adm-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
      .adm-tile { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; min-height: 96px; display: flex; flex-direction: column; }
      .adm-tile-label { color: var(--ink-2); font-size: 12px; }
      .adm-tile-value { font-size: 26px; font-weight: 700; margin: 4px 0 6px; line-height: 1.1; }
      .adm-tile-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 12px; flex-wrap: wrap; }
      .adm-grow { flex: 1; display: flex; flex-direction: column; gap: 4px; }
      .adm-delta { font-size: 12px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
      .adm-delta.up { color: var(--up); }
      .adm-delta.down { color: var(--down); }
      .adm-spark { margin-left: auto; }
      .adm-meter { height: 6px; border-radius: 3px; background: var(--grid); overflow: hidden; }
      .adm-meter span { display: block; height: 100%; border-radius: 3px; background: var(--good); }
      .adm-meter[data-state='warning'] span { background: var(--warning); }
      .adm-meter[data-state='critical'] span { background: var(--critical); }
      .adm-grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 520px), 1fr)); gap: 12px; margin-top: 12px; }
      .adm-grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 12px; margin-top: 12px; }
      .adm-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-top: 12px; min-width: 0; }
      .adm-grid2 > .adm-card, .adm-grid3 > .adm-card { margin-top: 0; }
      .adm-chart { position: relative; width: 100%; }
      .adm-chart svg { display: block; overflow: visible; }
      .adm-grid { stroke: var(--grid); stroke-width: 1; }
      .adm-base { stroke: var(--base); stroke-width: 1; }
      .adm-cross { stroke: var(--base); stroke-width: 1; }
      .adm-tick { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
      .adm-ring { stroke: var(--surface); stroke-width: 2; }
      .adm-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--ink-2); margin-bottom: 6px; }
      .adm-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
      .adm-tip { position: absolute; top: 28px; pointer-events: none; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12); border-radius: 10px; padding: 8px 10px; font-size: 12px; min-width: 170px; z-index: 5; }
      .adm-tip b { display: block; margin-bottom: 4px; }
      .adm-tip div { display: flex; align-items: center; gap: 6px; }
      .adm-tip i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
      .adm-tip span { color: var(--ink-2); }
      .adm-tip em { margin-left: auto; font-style: normal; font-weight: 600; font-variant-numeric: tabular-nums; }
      .adm-hbars { display: flex; flex-direction: column; gap: 8px; }
      .adm-hbar { display: grid; grid-template-columns: minmax(90px, 34%) 1fr auto; align-items: center; gap: 10px; font-size: 13px; }
      .adm-hbar-label { color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .adm-hbar-track { height: 12px; }
      .adm-hbar-fill { display: block; height: 100%; min-width: 2px; border-radius: 0 4px 4px 0; }
      .adm-hbar-value { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
      .adm-hbar-value small { color: var(--muted); font-weight: 400; }
      .adm-label { font-size: 12px; color: var(--muted); margin: 0 0 6px; }
      .adm-hbars + .adm-label { margin-top: 14px; }
      .adm-more { margin-top: 10px; }
      .adm-kv { align-content: start; display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin-top: 14px; font-size: 13px; }
      .adm-kv span { color: var(--ink-2); }
      .adm-kv b { font-weight: 600; overflow-wrap: anywhere; }
      .adm-scroll { overflow-x: auto; }
      .adm-tall { max-height: 420px; overflow-y: auto; }
      .adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .adm-table th { text-align: left; font-weight: 600; color: var(--ink-2); padding: 8px 10px; border-bottom: 1px solid var(--base); white-space: nowrap; position: sticky; top: 0; background: var(--surface); }
      .adm-table td { padding: 7px 10px; border-bottom: 1px solid var(--grid); white-space: nowrap; }
      .adm-table .num { text-align: right; font-variant-numeric: tabular-nums; }
      .adm-table tbody tr:hover td { background: color-mix(in srgb, var(--grid) 45%, transparent); }
      .adm-heat { background: color-mix(in srgb, var(--s1) calc(var(--p) * 45%), transparent); }
      .adm-heat small { color: var(--ink-2); }
      .adm-details { margin-top: 10px; }
      .adm-details summary { cursor: pointer; color: var(--ink-2); font-size: 12px; }
      .adm-details .adm-scroll { max-height: 320px; overflow-y: auto; margin-top: 8px; }
      .adm-tabs { margin-bottom: 10px; }
      .adm-link { border: 0; background: none; padding: 0; color: var(--s1); cursor: pointer; font: inherit; text-align: left; }
      .adm-link:hover { text-decoration: underline; }
      .adm-pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; border: 1px solid var(--border); color: var(--ink-2); }
      .adm-pill-pro { border-color: var(--s3); color: var(--ink); }
      .adm-pill-free { border-color: var(--s2); }
      .adm-search { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
      .adm-search input { flex: 1; min-width: 220px; padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--page); color: var(--ink); font: inherit; }
      .adm-user .adm-kv { margin: 0 0 12px; }
      .adm-ok { color: var(--up); }
      .adm-bad { color: var(--critical); }
      @media (max-width: 600px) {
        .adm-tiles { grid-template-columns: 1fr 1fr; gap: 8px; }
        .adm-tile { padding: 10px 12px; min-height: 0; }
        .adm-tile-value { font-size: 22px; }
        .adm-spark { display: none; }
        .adm-top { align-items: flex-start; }
      }
      .adm-mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; font-weight: 400; }
    `}</style>
  );
}
