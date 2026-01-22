# Playwright DevOps Flight Deck

Static release signal board with UI and performance checks for CI/CD release confidence.

## Generate signals
```bash
npm install
npx playwright install
npm run test:ui
npm run test:perf
npm run test:signals
```

`npm run ci` or `scripts/run-ci.sh` runs all three in order.

## Dashboard binding
- The dashboard reads `ui/data/release-signals.json`.
- `scripts/build-release-signals.js` normalizes raw results from `test-results/ui/ui-results.json` and
  `test-results/performance/perf-results.json` into `test-results/summary/release-signals.json`.
- Archive `test-results/summary/release-signals.json` to replay signal history in the UI.
- All pass/fail decisions live in CI; the UI only renders the summary.

## Signal contract
- `ui.summary`: `status`, `label`, `totals` (total, passed, failed, skipped, flaky), `durationMs`.
- `performance.summary`: `status`, `label`, `scenarios` (total, passed, failed, skipped), `highlights` (avgMs, p95Ms, rps, errorRate).
- Units: `durationMs`, `avgMs`, `p95Ms` are ms; `errorRate` is a 0-1 ratio.

## Performance baselines
- `npm run test:perf:baseline` updates `tests/performance/baseline.json`.
- Guardrails: `PERF_REGRESSION_LIMIT`, `PERF_ERROR_BUDGET`.

## Run the UI
```bash
npm run serve
```
Open `http://localhost:8080/pages/index.html`.
