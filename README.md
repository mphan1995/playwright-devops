# Playwright DevOps Flight Deck

A static DevOps release-control UI plus Playwright suites focused on reliability, RBAC, and release safety.

## Tests
- `tests/ui`: release workflow and RBAC behavior checks.
- `tests/auth`: login flow coverage.
- `tests/performance`: CI-friendly latency, error rate, and throughput smoke checks.

## Run
```bash
npm install
npx playwright install
npm run test:ui
npm run test:perf
```

Update the perf baseline when the environment is stable:
```bash
npm run test:perf:baseline
```

View the UI locally:
```bash
npm run serve
```
Then open `http://localhost:8080/pages/index.html`.

## Performance In CI/CD
- `npm run ci` or `scripts/run-ci.sh` runs UI + perf suites.
- The perf runner starts a local server unless `PERF_SKIP_SERVER=1`; set `BASE_URL` to target another env.
- Baselines live in `tests/performance/baseline.json` with regression guardrails via `PERF_REGRESSION_LIMIT` and `PERF_ERROR_BUDGET`.
- Results are written to `test-results/performance/perf-results.json`.

## Layout
- `ui/pages`: dashboard, service health, users, policies, settings.
- `ui/components`: shared nav and header.
- `ui/assets`: app state and styling.
- `tests`: Playwright suites.
