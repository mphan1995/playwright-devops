const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const uiResultsPath = path.join(rootDir, "test-results", "ui", "ui-results.json");
const perfResultsPath = path.join(rootDir, "test-results", "performance", "perf-results.json");
const summaryDir = path.join(rootDir, "test-results", "summary");
const summaryPath = path.join(summaryDir, "release-signals.json");
const uiSignalsPath = path.join(rootDir, "ui", "data", "release-signals.json");

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusLabel(status) {
  if (status === "pass") return "Pass";
  if (status === "warn") return "Warn";
  if (status === "fail") return "Fail";
  return "No Data";
}

function emptyUiSummary() {
  return {
    summary: {
      status: "unknown",
      label: "No Data",
      totals: {
        total: null,
        passed: null,
        failed: null,
        skipped: null,
        flaky: null,
      },
      durationMs: null,
    },
  };
}

function emptyPerfSummary() {
  return {
    summary: {
      status: "unknown",
      label: "No Data",
      scenarios: {
        total: null,
        passed: null,
        failed: null,
        skipped: null,
      },
      highlights: {
        avgMs: null,
        p95Ms: null,
        rps: null,
        errorRate: null,
      },
    },
    scenarios: [],
  };
}

function accumulateSuites(suites, totals) {
  if (!Array.isArray(suites)) return;
  suites.forEach((suite) => {
    if (Array.isArray(suite.suites)) {
      accumulateSuites(suite.suites, totals);
    }
    if (!Array.isArray(suite.specs)) return;
    suite.specs.forEach((spec) => {
      if (!Array.isArray(spec.tests)) return;
      spec.tests.forEach((test) => {
        const outcome = test.outcome || test.status;
        const lastResult = Array.isArray(test.results) && test.results.length
          ? test.results[test.results.length - 1]
          : null;
        const resultStatus = lastResult?.status;
        const normalized = outcome || resultStatus;

        if (normalized === "expected" || normalized === "passed") {
          totals.passed += 1;
        } else if (
          normalized === "unexpected" ||
          normalized === "failed" ||
          normalized === "timedOut" ||
          normalized === "interrupted"
        ) {
          totals.failed += 1;
        } else if (normalized === "flaky") {
          totals.flaky += 1;
        } else if (normalized === "skipped") {
          totals.skipped += 1;
        }
      });
    });
  });
}

function summarizeUi(raw) {
  if (!raw) {
    return emptyUiSummary();
  }

  const stats = raw.stats || {};
  const totals = {
    passed: toNumber(stats.expected) ?? 0,
    failed: toNumber(stats.unexpected) ?? 0,
    flaky: toNumber(stats.flaky) ?? 0,
    skipped: toNumber(stats.skipped) ?? 0,
  };

  const hasStats = [
    stats.expected,
    stats.unexpected,
    stats.flaky,
    stats.skipped,
    stats.total,
  ].some((value) => Number.isFinite(Number(value)));

  if (!hasStats && Array.isArray(raw.suites)) {
    totals.passed = 0;
    totals.failed = 0;
    totals.flaky = 0;
    totals.skipped = 0;
    accumulateSuites(raw.suites, totals);
  }

  const totalFromStats = toNumber(stats.total);
  const total = Number.isFinite(totalFromStats)
    ? totalFromStats
    : totals.passed + totals.failed + totals.flaky + totals.skipped;

  const durationMs = toNumber(stats.duration) ?? toNumber(stats.durationMs);

  let status = "unknown";
  if (total > 0) {
    if (totals.failed > 0) {
      status = "fail";
    } else if (totals.flaky > 0) {
      status = "warn";
    } else {
      status = "pass";
    }
  }

  return {
    summary: {
      status,
      label: statusLabel(status),
      totals: {
        total,
        passed: totals.passed,
        failed: totals.failed,
        skipped: totals.skipped,
        flaky: totals.flaky,
      },
      durationMs: durationMs ?? null,
    },
  };
}

function summarizePerformance(raw) {
  if (!raw || !Array.isArray(raw.scenarios)) {
    return emptyPerfSummary();
  }

  const counts = {
    total: raw.scenarios.length,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  let worstAvg = null;
  let worstP95 = null;
  let minRps = null;
  let maxErrorRate = null;

  const scenarios = raw.scenarios.map((scenario) => {
    const status = scenario.status || "unknown";
    if (status === "pass") {
      counts.passed += 1;
    } else if (status === "fail") {
      counts.failed += 1;
    } else {
      counts.skipped += 1;
    }

    const metrics = scenario.metrics || {};
    const avgMs = toNumber(metrics.avgMs);
    const p95Ms = toNumber(metrics.p95Ms);
    const rps = toNumber(metrics.rps);
    const errorRate = toNumber(metrics.errorRate);

    if (avgMs !== null) {
      worstAvg = worstAvg === null ? avgMs : Math.max(worstAvg, avgMs);
    }
    if (p95Ms !== null) {
      worstP95 = worstP95 === null ? p95Ms : Math.max(worstP95, p95Ms);
    }
    if (rps !== null) {
      minRps = minRps === null ? rps : Math.min(minRps, rps);
    }
    if (errorRate !== null) {
      maxErrorRate = maxErrorRate === null ? errorRate : Math.max(maxErrorRate, errorRate);
    }

    return {
      name: scenario.name,
      path: scenario.path,
      status,
      metrics: {
        avgMs,
        p95Ms,
        rps,
        errorRate,
      },
    };
  });

  let status = "unknown";
  if (counts.total > 0) {
    if (counts.failed > 0) {
      status = "fail";
    } else if (counts.skipped > 0) {
      status = "warn";
    } else {
      status = "pass";
    }
  }

  return {
    summary: {
      status,
      label: statusLabel(status),
      scenarios: counts,
      highlights: {
        avgMs: worstAvg,
        p95Ms: worstP95,
        rps: minRps,
        errorRate: maxErrorRate,
      },
    },
    scenarios,
  };
}

function buildRunContext() {
  const run = {
    id: process.env.SIGNAL_RUN_ID,
    commit: process.env.SIGNAL_COMMIT,
    branch: process.env.SIGNAL_BRANCH,
    environment: process.env.SIGNAL_ENV,
  };

  const filtered = Object.entries(run).reduce((acc, [key, value]) => {
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return Object.keys(filtered).length ? filtered : null;
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function main() {
  const uiRaw = readJsonIfExists(uiResultsPath);
  const perfRaw = readJsonIfExists(perfResultsPath);

  const payload = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    ui: {
      source: "test-results/ui/ui-results.json",
      ...summarizeUi(uiRaw),
    },
    performance: {
      source: "test-results/performance/perf-results.json",
      ...summarizePerformance(perfRaw),
    },
  };

  const runContext = buildRunContext();
  if (runContext) {
    payload.run = runContext;
  }

  writeJson(summaryPath, payload);
  writeJson(uiSignalsPath, payload);

  console.log(`Release signals written to ${summaryPath}`);
}

main();
