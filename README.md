# Playwright DevOps Flight Deck

A production-style DevOps simulation UI plus Playwright tests. The UI models a full delivery pipeline with Jenkins, Terraform, Ansible, Prometheus, and Grafana so you can visualize how each stage behaves during a release.

## What you get
- A realistic DevOps control room UI (`index.html`, `style.css`, `script.js`).
- A simulated CI/CD flow with pipeline stages, metrics, and logs.
- Existing Playwright test setup (run with `npx playwright test`).
- Environment stubs in `env/` for local and staging.

## Quick start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```
3. Run Playwright tests:
   ```bash
   npx playwright test
   ```
4. Launch the UI locally:
   ```bash
   python3 -m http.server 8080
   ```
5. Open the simulation in your browser:
   ```
   http://localhost:8080/index.html
   ```

## DevOps simulation flow (UI)
1. Source Sync (Jenkins) - fetches code from the main branch.
2. Build Artifact (Jenkins) - builds and tags the container image.
3. Playwright Unit Tests - runs tests for API and UI safety checks.
4. Terraform Plan - detects drift and proposes infrastructure changes.
5. Terraform Apply - applies approved changes.
6. Ansible Deploy - configures services and rolls out the release.
7. Post-Deploy Tests - smoke and regression checks.
8. Observability Gate - Prometheus metrics and Grafana dashboards validate health.

## Environment configuration
- `env/local.env` contains a `BASE_URL` placeholder for Playwright.
- `env/staging.env` is currently empty and ready for staging values.

To load an environment file in bash:
```bash
set -a
source env/local.env
set +a
```

## Project layout
- `index.html` - UI structure and layout.
- `style.css` - styling, animation, and responsive layout.
- `script.js` - simulation logic for pipeline, metrics, and logs.
- `tests/` - Playwright tests.
- `playwright.config.ts` - Playwright configuration.
- `env/` - environment files.

## Notes
- Jenkins, Terraform, Ansible, Prometheus, and Grafana are simulated in the UI. No real infrastructure is created.
- The UI is front-end only, so you can run it on any local HTTP server.
- The simulation is designed to look like a production workflow for easier testing and discussion.

## Next steps you can implement
- Wire the UI to real Jenkins/Terraform/Ansible outputs.
- Stream real Prometheus metrics into the charts.
- Add Playwright test suites for regression and smoke stages.
