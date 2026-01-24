const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { performance } = require("perf_hooks");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "../..");
const scenariosPath = path.join(__dirname, "scenarios.json");
const baselinePath = path.join(__dirname, "baseline.json");
const resultsDir = path.join(rootDir, "test-results", "performance");
const resultsPath = path.join(resultsDir, "perf-results.json");

const scenariosConfig = JSON.parse(fs.readFileSync(scenariosPath, "utf8"));
const baseUrl = process.env.BASE_URL || scenariosConfig.baseUrl || "http://localhost:8080";
const defaults = {
  iterations: 20,
  concurrency: 4,
  warmup: 4,
  method: "GET",
  ...(scenariosConfig.defaults || {}),
};

const args = new Set(process.argv.slice(2));
const regressionLimit = toNumber(process.env.PERF_REGRESSION_LIMIT, 1.5);
const errorBudget = toNumber(process.env.PERF_ERROR_BUDGET, 0.01);
const updateBaseline = args.has("--update-baseline") || process.env.PERF_UPDATE_BASELINE === "1";
const requireBaseline = args.has("--require-baseline") || process.env.PERF_REQUIRE_BASELINE === "1";
const skipServer = args.has("--skip-server") || process.env.PERF_SKIP_SERVER === "1";

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isLocalBaseUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch (error) {
    return false;
  }
}

function requestOnce(targetUrl, method) {
  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const transport = parsed.protocol === "https:" ? https : http;
    const start = performance.now();

    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          Accept: "text/html",
          "Cache-Control": "no-cache",
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => {
          const duration = performance.now() - start;
          const statusCode = res.statusCode || 0;
          resolve({
            duration,
            statusCode,
            ok: statusCode > 0 && statusCode < 400,
          });
        });
      }
    );

    req.on("error", () => {
      resolve({ duration: performance.now() - start, statusCode: 0, ok: false });
    });

    req.end();
  });
}

async function runLoad(targetUrl, method, total, concurrency, trackDurations) {
  const durations = [];
  let errorCount = 0;
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, total));

  async function worker() {
    while (index < total) {
      index += 1;
      const result = await requestOnce(targetUrl, method);
      if (trackDurations) {
        durations.push(result.duration);
      }
      if (!result.ok) {
        errorCount += 1;
      }
    }
  }

  if (total <= 0) {
    return { durations, errorCount };
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return { durations, errorCount };
}

function toFixedNumber(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function computeMetrics(durations, errorCount, elapsedMs) {
  const total = durations.length;
  const sorted = durations.slice().sort((a, b) => a - b);
  const avgMs = total ? durations.reduce((sum, value) => sum + value, 0) / total : 0;
  const p95Index = total ? Math.min(total - 1, Math.ceil(total * 0.95) - 1) : 0;
  const minMs = total ? sorted[0] : 0;
  const maxMs = total ? sorted[sorted.length - 1] : 0;
  const p95Ms = total ? sorted[p95Index] : 0;
  const rps = elapsedMs > 0 ? total / (elapsedMs / 1000) : 0;
  const errorRate = total ? errorCount / total : 0;

  return {
    total,
    avgMs: toFixedNumber(avgMs),
    p95Ms: toFixedNumber(p95Ms),
    minMs: toFixedNumber(minMs),
    maxMs: toFixedNumber(maxMs),
    rps: toFixedNumber(rps),
    errorRate: toFixedNumber(errorRate, 4),
    elapsedMs: toFixedNumber(elapsedMs),
  };
}

function compareWithBaseline(metrics, baseline) {
  if (!baseline) {
    return {
      status: requireBaseline ? "fail" : "skip",
      failures: ["baseline missing"],
    };
  }

  const allowedAvg = baseline.avgMs * regressionLimit;
  const allowedP95 = baseline.p95Ms * regressionLimit;
  const allowedErrorRate = (baseline.errorRate || 0) + errorBudget;
  const minRps = baseline.rps > 0 ? baseline.rps / regressionLimit : 0;
  const failures = [];

  if (metrics.avgMs > allowedAvg) {
    failures.push(`avg ${metrics.avgMs}ms > ${toFixedNumber(allowedAvg)}ms`);
  }
  if (metrics.p95Ms > allowedP95) {
    failures.push(`p95 ${metrics.p95Ms}ms > ${toFixedNumber(allowedP95)}ms`);
  }
  if (metrics.rps < minRps) {
    failures.push(`rps ${metrics.rps} < ${toFixedNumber(minRps)}`);
  }
  if (metrics.errorRate > allowedErrorRate) {
    failures.push(`errorRate ${metrics.errorRate} > ${toFixedNumber(allowedErrorRate, 4)}`);
  }

  return {
    status: failures.length ? "fail" : "pass",
    failures,
    thresholds: {
      avgMs: toFixedNumber(allowedAvg),
      p95Ms: toFixedNumber(allowedP95),
      rps: toFixedNumber(minRps),
      errorRate: toFixedNumber(allowedErrorRate, 4),
    },
  };
}

async function probeUrl(targetUrl) {
  const result = await requestOnce(targetUrl, "GET");
  return result.ok;
}

async function waitForServer(targetUrl, attempts = 30, delayMs = 500) {
  for (let i = 0; i < attempts; i += 1) {
    const ready = await probeUrl(targetUrl);
    if (ready) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function startServer() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawn(npmCmd, ["run", "serve"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env },
  });
}

async function runScenario(scenario) {
  const targetUrl = new URL(scenario.path, baseUrl).toString();
  const method = scenario.method || defaults.method;
  const iterations = Math.max(1, toNumber(scenario.iterations, defaults.iterations));
  const concurrency = Math.max(1, toNumber(scenario.concurrency, defaults.concurrency));
  const warmup = Math.max(0, toNumber(scenario.warmup, defaults.warmup));

  if (warmup > 0) {
    await runLoad(targetUrl, method, warmup, Math.min(concurrency, warmup), false);
  }

  const start = performance.now();
  const { durations, errorCount } = await runLoad(
    targetUrl,
    method,
    iterations,
    concurrency,
    true
  );
  const elapsedMs = performance.now() - start;

  return {
    url: targetUrl,
    method,
    iterations,
    concurrency,
    warmup,
    metrics: computeMetrics(durations, errorCount, elapsedMs),
  };
}

async function main() {
  const scenarios = scenariosConfig.scenarios || [];
  if (!scenarios.length) {
    throw new Error("No performance scenarios defined.");
  }

  let baseline = null;
  if (fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  }

  const probePath = scenarios[0].path || "/";
  const probeTarget = new URL(probePath, baseUrl).toString();
  let serverProcess = null;

  try {
    if (!skipServer && isLocalBaseUrl(baseUrl)) {
      const alreadyUp = await probeUrl(probeTarget);
      if (!alreadyUp) {
        serverProcess = startServer();
        const ready = await waitForServer(probeTarget, 40, 500);
        if (!ready) {
          throw new Error("Timed out waiting for local server.");
        }
      }
    }

    const results = {
      baseUrl,
      startedAt: new Date().toISOString(),
      config: {
        defaults,
        regressionLimit,
        errorBudget,
      },
      scenarios: [],
    };

    for (const scenario of scenarios) {
      const output = await runScenario(scenario);
      const baselineMetrics = baseline?.scenarios?.[scenario.name] || null;
      const check = compareWithBaseline(output.metrics, baselineMetrics);

      results.scenarios.push({
        name: scenario.name,
        path: scenario.path,
        method: output.method,
        iterations: output.iterations,
        concurrency: output.concurrency,
        warmup: output.warmup,
        metrics: output.metrics,
        baseline: baselineMetrics,
        thresholds: check.thresholds || null,
        status: check.status,
        failures: check.failures || [],
      });
    }

    results.finishedAt = new Date().toISOString();

    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    if (updateBaseline) {
      const newBaseline = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        scenarios: results.scenarios.reduce((acc, scenario) => {
          acc[scenario.name] = scenario.metrics;
          return acc;
        }, {}),
      };
      fs.writeFileSync(baselinePath, JSON.stringify(newBaseline, null, 2));
    }

    const summaryRows = results.scenarios.map((scenario) => ({
      scenario: scenario.name,
      avgMs: scenario.metrics.avgMs,
      p95Ms: scenario.metrics.p95Ms,
      minMs: scenario.metrics.minMs,
      maxMs: scenario.metrics.maxMs,
      rps: scenario.metrics.rps,
      errorRate: scenario.metrics.errorRate,
      status: scenario.status,
    }));

    console.log("Performance results");
    console.table(summaryRows);

    if (!updateBaseline) {
      const failures = results.scenarios.filter((scenario) => scenario.status === "fail");
      if (failures.length) {
        failures.forEach((scenario) => {
          console.error(`Scenario ${scenario.name} failed: ${scenario.failures.join("; ")}`);
        });
        process.exitCode = 1;
      }
    }
  } finally {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
