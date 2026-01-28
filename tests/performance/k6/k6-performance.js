import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Counter, Trend } from "k6/metrics";

const startedAt = new Date().toISOString();
const scriptDir = getScriptDir(import.meta.url);
const configRaw = JSON.parse(open("../scenarios.json"));
const baseUrl = __ENV.BASE_URL || configRaw.baseUrl || "http://localhost:8080";
const defaults = Object.assign(
  {
    iterations: 20,
    concurrency: 4,
    warmup: 4,
    method: "GET",
    sleep: 0,
  },
  configRaw.defaults || {}
);

const regressionLimit = toNumber(__ENV.PERF_REGRESSION_LIMIT, 1.5);
const errorBudget = toNumber(__ENV.PERF_ERROR_BUDGET, 0.01);
const updateBaseline = __ENV.PERF_UPDATE_BASELINE === "1";
const requireBaseline = __ENV.PERF_REQUIRE_BASELINE === "1";
const resultsPath = __ENV.PERF_RESULTS_PATH || "./perf-results.json";
const baselinePath = __ENV.PERF_BASELINE_PATH || "./baseline.json";

const globalSignals = Array.isArray(configRaw.signals) ? configRaw.signals : [];
const scenarioDefs = expandScenarios(configRaw.scenarios || [], defaults, globalSignals);

if (!scenarioDefs.length) {
  throw new Error("No performance scenarios defined.");
}

const scenarioMetrics = {};
const metricNames = {};
const scenarioRunMap = {};
const scenarioNameUsage = {};

scenarioDefs.forEach((scenario) => {
  const safeName = uniqueMetricName(scenario.name, scenarioNameUsage);
  metricNames[scenario.name] = {
    duration: `scenario_duration_${safeName}`,
    requests: `scenario_requests_${safeName}`,
    errors: `scenario_errors_${safeName}`,
  };
  scenarioMetrics[scenario.name] = {
    duration: new Trend(metricNames[scenario.name].duration, true),
    requests: new Counter(metricNames[scenario.name].requests),
    errors: new Counter(metricNames[scenario.name].errors),
  };
});

export const options = {
  scenarios: buildK6Scenarios(scenarioDefs, scenarioRunMap),
};

export function runScenario() {
  const run = scenarioRunMap[exec.scenario.name];
  if (!run) {
    return;
  }

  const payload = selectPayload(run);
  const { requests, signalChecks, includeSignals } = buildRequests(run, payload);
  const responses = http.batch(requests);

  if (!run.isWarmup) {
    recordMetrics(run, responses, includeSignals);
    runChecks(run, responses, signalChecks);
  }

  if (run.sleep > 0) {
    sleep(run.sleep);
  }
}

export function handleSummary(data) {
  const finishedAt = new Date().toISOString();
  const baseline = readBaseline(baselinePath);

  const results = {
    baseUrl,
    startedAt,
    finishedAt,
    config: {
      defaults,
      regressionLimit,
      errorBudget,
    },
    scenarios: scenarioDefs.map((scenario) => {
      const metrics = extractScenarioMetrics(data, scenario.name);
      const baselineMetrics =
        baseline && baseline.scenarios ? baseline.scenarios[scenario.name] || null : null;
      const checkResult = compareWithBaseline(metrics, baselineMetrics);
      return {
        name: scenario.name,
        path: scenario.path,
        method: scenario.method,
        iterations: scenario.iterations,
        concurrency: scenario.concurrency,
        warmup: scenario.warmup,
        metrics,
        baseline: baselineMetrics,
        thresholds: checkResult.thresholds || null,
        status: checkResult.status,
        failures: checkResult.failures || [],
      };
    }),
  };

  const summaryLines = formatSummary(results.scenarios);
  const outputs = {
    stdout: summaryLines,
    [resultsPath]: JSON.stringify(results, null, 2),
  };

  if (updateBaseline) {
    outputs[baselinePath] = JSON.stringify(buildBaseline(results), null, 2);
  }

  return outputs;
}

function expandScenarios(scenarios, baseDefaults, sharedSignals) {
  const output = [];
  scenarios.forEach((scenario) => {
    if (!scenario || !scenario.name || !scenario.path) {
      return;
    }

    const variants = Array.isArray(scenario.variants) ? scenario.variants : [];
    if (variants.length) {
      variants.forEach((variant, index) => {
        output.push(
          normalizeScenario(
            Object.assign({}, scenario, variant, {
              name: variant.name ? `${scenario.name}-${variant.name}` : `${scenario.name}-${index + 1}`,
              signals: mergeSignals(sharedSignals, scenario.signals, variant.signals),
            }),
            baseDefaults
          )
        );
      });
      return;
    }

    output.push(
      normalizeScenario(
        Object.assign({}, scenario, {
          signals: mergeSignals(sharedSignals, scenario.signals),
        }),
        baseDefaults
      )
    );
  });
  return output;
}

function normalizeScenario(scenario, baseDefaults) {
  return {
    name: scenario.name,
    path: scenario.path,
    method: (scenario.method || baseDefaults.method || "GET").toUpperCase(),
    iterations: Math.max(1, toNumber(scenario.iterations, baseDefaults.iterations)),
    concurrency: Math.max(1, toNumber(scenario.concurrency, baseDefaults.concurrency)),
    warmup: Math.max(0, toNumber(scenario.warmup, baseDefaults.warmup)),
    sleep: Math.max(0, toNumber(scenario.sleep, baseDefaults.sleep)),
    headers: scenario.headers || {},
    signals: Array.isArray(scenario.signals) ? scenario.signals : [],
    payloads: Array.isArray(scenario.payloads) ? scenario.payloads : [],
    includeSignalsInMetrics:
      typeof scenario.includeSignalsInMetrics === "boolean" ? scenario.includeSignalsInMetrics : null,
  };
}

function buildK6Scenarios(defs, runMap) {
  return defs.reduce((acc, scenario) => {
    const warmupIterations = Math.max(0, scenario.warmup);
    const warmupVus = Math.max(1, Math.min(scenario.concurrency, warmupIterations || 1));

    if (warmupIterations > 0) {
      const warmupName = `${scenario.name}__warmup`;
      acc[warmupName] = {
        executor: "shared-iterations",
        vus: warmupVus,
        iterations: warmupIterations,
        exec: "runScenario",
        tags: {
          phase: "warmup",
          target: scenario.name,
        },
      };
      runMap[warmupName] = Object.assign({}, scenario, { isWarmup: true });
    }

    acc[scenario.name] = {
      executor: "shared-iterations",
      vus: scenario.concurrency,
      iterations: scenario.iterations,
      exec: "runScenario",
      tags: {
        phase: "main",
        target: scenario.name,
      },
    };
    runMap[scenario.name] = Object.assign({}, scenario, { isWarmup: false });

    return acc;
  }, {});
}

function buildRequests(run, payload) {
  const signals = Array.isArray(run.signals) ? run.signals.map(normalizeSignal).filter(Boolean) : [];
  const includeSignals =
    typeof run.includeSignalsInMetrics === "boolean" ? run.includeSignalsInMetrics : signals.length > 0;

  const requests = [];
  const signalChecks = [];

  requests.push(buildRequest(run, run.path, payload, "main"));

  signals.forEach((signal, index) => {
    if (!signal || !signal.path) {
      return;
    }
    const signalBody = signal.body !== undefined ? signal.body : null;
    requests.push(buildRequest(run, signal.path, signalBody, signal.name || "signal", signal));
    signalChecks.push({
      index: index + 1,
      signal,
    });
  });

  return { requests, signalChecks, includeSignals };
}

function buildRequest(run, path, payload, resource, signalOverrides) {
  const url = resolveUrl(baseUrl, path);
  const method = ((signalOverrides && signalOverrides.method) || run.method || "GET").toUpperCase();
  const headers = Object.assign(
    {},
    run.headers,
    (signalOverrides && signalOverrides.headers) || {}
  );
  let body = payload;

  if (payload && typeof payload === "object" && payload.headers) {
    Object.assign(headers, payload.headers);
  }
  if (payload && typeof payload === "object" && payload.body !== undefined) {
    body = payload.body;
  }

  if (method === "GET" || method === "HEAD") {
    body = null;
  } else if (body && typeof body === "object") {
    body = JSON.stringify(body);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  return {
    method,
    url,
    body,
    params: {
      headers,
      tags: {
        target: run.name,
        resource,
      },
    },
  };
}

function recordMetrics(run, responses, includeSignals) {
  const metrics = scenarioMetrics[run.name];
  if (!metrics) {
    return;
  }
  responses.forEach((response, index) => {
    if (!includeSignals && index > 0) {
      return;
    }
    metrics.duration.add(response.timings.duration);
    metrics.requests.add(1);
    if (response.status === 0 || response.status >= 400) {
      metrics.errors.add(1);
    }
  });
}

function runChecks(run, responses, signalChecks) {
  const mainResponse = responses[0];
  check(
    mainResponse,
    {
      "status ok": (res) => res.status >= 200 && res.status < 400,
    },
    { target: run.name, resource: "main" }
  );

  signalChecks.forEach(({ index, signal }) => {
    const response = responses[index];
    if (!response) {
      return;
    }
    const expectedStatus = signal.status || (signal.expect && signal.expect.status) || 200;
    const checks = {
      "status ok": (res) => res.status === expectedStatus || (res.status >= 200 && res.status < 400),
    };
    check(response, checks, { target: run.name, resource: signal.name || "signal" });
    validateSignalJson(response, signal, run.name);
  });
}

function validateSignalJson(response, signal, targetName) {
  const jsonPaths = signal.jsonPaths || (signal.expect && signal.expect.jsonPaths);
  if (!Array.isArray(jsonPaths) || !jsonPaths.length) {
    return;
  }

  let payload = null;
  try {
    payload = response.json();
  } catch (error) {
    check(
      response,
      {
        "json parsed": () => false,
      },
      { target: targetName, resource: signal.name || "signal" }
    );
    return;
  }

  const minLength =
    signal.arrayMin !== undefined && signal.arrayMin !== null
      ? signal.arrayMin
      : toNumber(signal.expect && signal.expect.arrayMin, null);

  jsonPaths.forEach((path) => {
    const value = getValueAtPath(payload, path);
    const label = `json ${path}`;
    if (Array.isArray(value) && minLength !== null) {
      check(
        response,
        {
          [label]: () => value.length >= minLength,
        },
        { target: targetName, resource: signal.name || "signal" }
      );
    } else {
      check(
        response,
        {
          [label]: () => value !== undefined && value !== null,
        },
        { target: targetName, resource: signal.name || "signal" }
      );
    }
  });
}

function extractScenarioMetrics(data, scenarioName) {
  const names = metricNames[scenarioName];
  const durationValues =
    data.metrics && data.metrics[names.duration] ? data.metrics[names.duration].values || {} : {};
  const requestValues =
    data.metrics && data.metrics[names.requests] ? data.metrics[names.requests].values || {} : {};
  const errorValues =
    data.metrics && data.metrics[names.errors] ? data.metrics[names.errors].values || {} : {};

  const count = toNumber(requestValues.count, 0);
  const errorCount = toNumber(errorValues.count, 0);
  const errorRate = count > 0 ? errorCount / count : 0;

  return {
    total: count,
    avgMs: toFixedNumber(durationValues.avg || 0),
    p95Ms: toFixedNumber(durationValues["p(95)"] || 0),
    minMs: toFixedNumber(durationValues.min || 0),
    maxMs: toFixedNumber(durationValues.max || 0),
    rps: toFixedNumber(requestValues.rate || 0),
    errorRate: toFixedNumber(errorRate, 4),
  };
}

function buildBaseline(results) {
  return {
    generatedAt: new Date().toISOString(),
    baseUrl: results.baseUrl,
    scenarios: results.scenarios.reduce((acc, scenario) => {
      acc[scenario.name] = scenario.metrics;
      return acc;
    }, {}),
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

function formatSummary(scenarios) {
  const rows = scenarios.map((scenario) => ({
    scenario: scenario.name,
    avgMs: scenario.metrics.avgMs,
    p95Ms: scenario.metrics.p95Ms,
    minMs: scenario.metrics.minMs,
    maxMs: scenario.metrics.maxMs,
    rps: scenario.metrics.rps,
    errorRate: scenario.metrics.errorRate,
    status: scenario.status,
  }));

  const lines = ["Performance results", "scenario\tavgMs\tp95Ms\tminMs\tmaxMs\trps\terrorRate\tstatus"];
  rows.forEach((row) => {
    lines.push(
      [
        row.scenario,
        row.avgMs,
        row.p95Ms,
        row.minMs,
        row.maxMs,
        row.rps,
        row.errorRate,
        row.status,
      ].join("\t")
    );
  });
  return `${lines.join("\n")}\n`;
}

function readBaseline(path) {
  const candidates = [];
  if (path) {
    candidates.push(path);
  }
  if (path && scriptDir && path.indexOf(`${scriptDir}/`) === 0) {
    candidates.push(path.slice(scriptDir.length + 1));
  }
  if (path !== "./baseline.json") {
    candidates.push("./baseline.json");
  }
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      return JSON.parse(open(candidates[i]));
    } catch (error) {
      // try next candidate
    }
  }
  return null;
}

function normalizeSignal(signal) {
  if (!signal) {
    return null;
  }
  if (typeof signal === "string") {
    return {
      name: signal,
      path: signal,
      method: "GET",
    };
  }
  if (typeof signal === "object") {
    return {
      name: signal.name || signal.path || signal.url || "signal",
      path: signal.path || signal.url,
      method: (signal.method || "GET").toUpperCase(),
      headers: signal.headers || {},
      body: signal.body,
      status: signal.status,
      jsonPaths: signal.jsonPaths,
      arrayMin: signal.arrayMin,
      expect: signal.expect,
    };
  }
  return null;
}

function mergeSignals(...collections) {
  const merged = [];
  collections.forEach((collection) => {
    if (!collection) {
      return;
    }
    if (Array.isArray(collection)) {
      merged.push(...collection);
    }
  });
  return merged;
}

function selectPayload(run) {
  if (!Array.isArray(run.payloads) || !run.payloads.length) {
    return null;
  }
  const index = __ITER % run.payloads.length;
  return run.payloads[index];
}

function resolveUrl(base, path) {
  if (!path) {
    return base;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const trimmedBase = base.replace(/\/+$/, "");
  const trimmedPath = String(path).replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedPath}`;
}

function getScriptDir(metaUrl) {
  const path = fileUrlToPath(metaUrl);
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) {
    return ".";
  }
  return path.slice(0, lastSlash);
}

function fileUrlToPath(url) {
  if (!url) {
    return ".";
  }
  if (url.indexOf("file://") === 0) {
    return decodeURIComponent(url.slice("file://".length));
  }
  return url;
}

function getValueAtPath(obj, path) {
  if (!obj || !path) {
    return undefined;
  }
  return String(path)
    .split(".")
    .reduce((acc, key) => {
      if (acc === null || acc === undefined) {
        return undefined;
      }
      return acc[key];
    }, obj);
}

function uniqueMetricName(name, usage) {
  const base = sanitizeMetricName(name);
  const count = usage[base] || 0;
  usage[base] = count + 1;
  return count === 0 ? base : `${base}_${count + 1}`;
}

function sanitizeMetricName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
}

function toFixedNumber(value, digits = 2) {
  return Number(Number(value).toFixed(digits));
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
