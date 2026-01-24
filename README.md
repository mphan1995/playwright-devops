# Playwright DevOps Flight Deck
Release signals board with UI + performance checks.

## Setup
```bash
npm install
npx playwright install
```

## Update from GitHub (Commit will be change)
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

## Run the UI (port 8080)
```bash
npm run serve
```
Open `http://localhost:8080/pages/index.html`. If port 8080 is busy, stop the other service first.

## Run tests (server must already be running)
```bash
npm run test:ui
npm run test:perf
```
Signals are written to `ui/data/release-signals.json` after each test run.

## Optional
```bash
npm run test:perf:baseline
```
Set `PW_USE_SERVER=1` if you want Playwright to start and stop the server for UI tests.

---
Lam Thông  
Zalo: 0779050531
