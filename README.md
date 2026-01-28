🚀 Playwright DevOps Flight Deck

Release Safety Flight Deck
Validate UI, performance, and operational signals before release — not UI correctness.

❗ This project treats testing as release signals, not test reports.

⚙️ Setup
npm install
npx playwright install

🔄 Update from GitHub
git fetch origin
git pull --rebase origin main


If you have local changes:

git stash
git pull --rebase origin main
git stash pop

🖥️ Run the UI (port 8080)
npm run serve


Open:
👉 http://localhost:8080/pages/index.html

Stop other services if port 8080 is already in use.

🧪 Run Release Signals

Server must be running.

UI signals (Playwright)
npm run test:ui

Performance signals (k6 + baseline gate)
npm run test:perf


Signals are written to:

ui/data/release-signals.json

📊 Performance Baseline (one-time / intentional)
npm run test:perf:baseline


Baseline represents a known-good release state
Future runs are checked for regression, not benchmarking.

⚙️ Optional
PW_USE_SERVER=1 npm run test:ui


Let Playwright manage server start/stop automatically.

🧠 Key Principles

Playwright = Release signal validator

k6 = Load generator (not decision maker)

Baseline = Release safety reference

No signal → Release blocked

Regression → Release blocked

Author: Lam Thông
📱 Zalo: 0779 050 531