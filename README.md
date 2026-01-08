# Playwright DevOps Flight Deck

A production-style DevOps simulation UI plus Playwright tests. The UI models a full delivery pipeline with Jenkins, Terraform, Ansible, Prometheus, and Grafana so you can visualize how each stage behaves during a release.

## What you get
- A multi-page DevOps control room UI under `ui/`.
- Shared navigation + header components (RBAC-aware).
- Simulated CI/CD flow with pipeline stages, metrics, and logs.
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
   http://localhost:8080/ui/pages/index.html
   ```

## UI pages
- `ui/pages/index.html` - dashboard (pipeline, metrics, QA gates).
- `ui/pages/services.html` - service health and blast radius view.
- `ui/pages/users.html` - user directory and RBAC overview.
- `ui/pages/permissions.html` - policy matrix and permissions.
- `ui/pages/settings.html` - environment settings and release guardrails.

## Navigation, RBAC, and state
- Navigation is real multi-page routing, not a single-page view.
- RBAC rules are enforced in the UI:
  - Admin: trigger, pause, approve, rollback, resume.
  - Operator: resume, observe.
  - User: read-only.
- Role and simulation state persist in `localStorage` to test state retention across pages.
- Release state and approvals persist across refresh for realistic lifecycle testing.
- Route health indicators show last navigation and broken route count.

## Release simulation controls
- Lifecycle states: Queued, Running, Paused, Blocked, Succeeded, Failed, Rolled Back.
- Controls: Trigger, Pause, Resume, Approve, Reject, Rollback (RBAC-gated).
- Incident toggles and recovery actions update policy signals and core status cards.

## Partial failure and route health
- Route health panel can simulate broken pages (for example: Services down while Users and Dashboard still load).
- Broken routes show a fallback banner while other pages remain available.

## Time-based conditions
- Deployment, maintenance, and freeze windows are simulated on the dashboard.
- Use the Override button to flip a window for testing.

## Blast radius and isolation
- `services.html` simulates a telemetry feed that can fail without breaking the rest of the system.
- Trigger a failure from the UI button or open:
  ```
  http://localhost:8080/ui/pages/services.html?fail=1
  ```

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
- `ui/components/` - shared navigation and header components.
- `ui/assets/style.css` - styling, animation, responsive layout.
- `ui/assets/app.js` - global navigation, RBAC, and state.
- `ui/assets/dashboard/` - dashboard modules (release, incidents, routes, windows, metrics).
- `ui/assets/services.js` - service health feed simulation.
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
