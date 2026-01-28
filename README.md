# 🚀 Playwright DevOps Flight Deck

Release Safety Flight Deck: validate UI, performance, and operational signals before release — not UI correctness.

> ❗ This project treats testing as release signals, not test reports.

## ⚙️ Setup

```bash
npm install
npx playwright install
```

### Install k6 (for performance signals)

- macOS:
```bash
brew install k6
```
- Windows:
```bash
choco install k6
```
- Linux: use your package manager or the official k6 installer for your distro.

## 🔄 Update from GitHub

```bash
git fetch origin
git pull --rebase origin main
```

If you have local changes:
```bash
git stash
git pull --rebase origin main
git stash pop
```

## 🖥️ Run the UI (port 8080)

```bash
npm run serve
```

Open:
```text
http://localhost:8080/pages/index.html
```

Stop other services if port 8080 is already in use.

## 🧪 Run Release Signals

Server must be running.

UI signals (Playwright):
```bash
npm run test:ui
```

Performance signals (Node runner):
```bash
npm run test:perf
```

Direct k6 run (uses `tests/performance/scenarios.json`):
```bash
k6 run tests/performance/k6/k6-performance.js
```

Signals are written to:
```text
ui/data/release-signals.json
```

## 📊 Performance Baseline (one-time / intentional)

```bash
npm run test:perf:baseline
```

Create/update k6 baseline directly:
```bash
PERF_UPDATE_BASELINE=1 k6 run tests/performance/k6/k6-performance.js
```

Default k6 outputs:
```text
tests/performance/k6/perf-results.json
tests/performance/k6/baseline.json
```

Baseline represents a known-good release state. Future runs are checked for regression, not benchmarking.

## ⚙️ Optional

Let Playwright manage server start/stop automatically:
```bash
PW_USE_SERVER=1 npm run test:ui
```

## 🧠 Key Principles

- Playwright = release signal validator
- k6 = load generator (not decision maker)
- Baseline = release safety reference
- No signal → release blocked
- Regression → release blocked

---
Author: Lam Thông  
📱 Zalo: 0779 050 531
