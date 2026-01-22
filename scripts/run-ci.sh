#!/usr/bin/env bash
set -euo pipefail

npm ci
npx playwright install

npm run test:ui
npm run test:perf
npm run test:signals
