# rewordly-web

## Paid API calls need approval

Ask the user before running anything that calls a paid API (OpenAI or any other) with a real key, however small the cost. Wait for a clear yes. This covers:

- `npm run eval:live` (test/eval/live-check.eval.ts): about 100-150 OpenAI calls per run, roughly $0.02.
- Scratch scripts or tests that call `checkWithModel`, `openai.chat.completions.create` or the real `/api/*` endpoints with the key from `.env.local`.
- Running the site locally (`npm run dev`) and sending it checks, rewrites or grammar requests, by hand or from the extension. This includes the extension's real-API Playwright specs (`npm run test:smoke`, `SMOKE=1 npx playwright test ...`: smoke, store-assets, marketing-shots).
- Repeating an approved run: each new run needs its own approval.

When you ask, give the number of calls, the models and the estimated cost. After the runs, report the total.

These calls use the "Rewordly Test" key in `.env.local`. They are not written to `ai_usage_log`, so the user only sees them on the OpenAI dashboard.

No approval is needed for `npm test` here (OpenAI and Supabase are mocked), or for the extension's `npm test` and `npm run test:e2e` without `SMOKE` (live.spec.ts uses a mock API server).
