(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, state, utils } = dashboard;

  const STORAGE_KEY = "devops-metrics-session";
  const seriesLength = 22;
  const metricKeys = ["reqRate", "errRate", "latency", "apdex", "saturation", "cacheHit"];

  let charts = [];
  let metricSeries = {};

  const metricProfiles = {
    normal: {
      reqRate: { min: 980, max: 1600, deltaMin: -60, deltaMax: 80 },
      errRate: { min: 0.2, max: 1.6, deltaMin: -0.08, deltaMax: 0.1 },
      latency: { min: 160, max: 360, deltaMin: -18, deltaMax: 24 },
      apdex: { min: 0.92, max: 0.99, deltaMin: -0.01, deltaMax: 0.008 },
      saturation: { min: 42, max: 72, deltaMin: -4, deltaMax: 6 },
      cacheHit: { min: 92, max: 99, deltaMin: -1.2, deltaMax: 0.8 },
    },
    load: {
      reqRate: { min: 1400, max: 2200, deltaMin: -80, deltaMax: 140 },
      errRate: { min: 0.6, max: 2.4, deltaMin: -0.12, deltaMax: 0.2 },
      latency: { min: 220, max: 520, deltaMin: -12, deltaMax: 32 },
      apdex: { min: 0.86, max: 0.96, deltaMin: -0.012, deltaMax: 0.01 },
      saturation: { min: 55, max: 82, deltaMin: -3, deltaMax: 8 },
      cacheHit: { min: 88, max: 97, deltaMin: -1.4, deltaMax: 0.9 },
    },
    spike: {
      reqRate: { min: 1800, max: 2600, deltaMin: -120, deltaMax: 180 },
      errRate: { min: 1.0, max: 4.2, deltaMin: -0.15, deltaMax: 0.35 },
      latency: { min: 320, max: 760, deltaMin: -16, deltaMax: 48 },
      apdex: { min: 0.75, max: 0.9, deltaMin: -0.02, deltaMax: 0.014 },
      saturation: { min: 70, max: 96, deltaMin: -2, deltaMax: 10 },
      cacheHit: { min: 80, max: 94, deltaMin: -1.8, deltaMax: 1.1 },
    },
  };

  function sanitizeSeries(values) {
    if (!Array.isArray(values)) return null;
    const filtered = values.filter((value) => Number.isFinite(value));
    if (!filtered.length) return null;
    return filtered.slice(-seriesLength);
  }

  function seedSeries(key) {
    const profile = metricProfiles.normal[key];
    if (!profile) {
      return utils.seedValues(seriesLength, 60, 100);
    }
    return utils.seedValues(seriesLength, profile.min, profile.max);
  }

  function loadSession() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const nextState = parsed?.metricState || {};
      metricKeys.forEach((key) => {
        const value = Number(nextState[key]);
        if (Number.isFinite(value)) {
          state.metricState[key] = value;
        }
      });
      const storedSeries = parsed?.series || {};
      metricSeries = metricKeys.reduce((acc, key) => {
        const series = sanitizeSeries(storedSeries[key]);
        if (series) {
          acc[key] = series;
        }
        return acc;
      }, {});
    } catch (error) {
      metricSeries = {};
    }
  }

  function saveSession() {
    try {
      const payload = {
        metricState: state.metricState,
        series: metricSeries,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function refreshCharts() {
    charts = Array.from(document.querySelectorAll(".spark")).map((canvas) => {
      const key = canvas.dataset.series || "";
      const values = metricSeries[key] ? metricSeries[key] : seedSeries(key);
      if (key) {
        metricSeries[key] = values;
      }
      return {
        canvas,
        key,
        color: canvas.dataset.color || "#47d7c3",
        values,
      };
    });
  }

  loadSession();
  refreshCharts();

  function updateAlertState(label, className) {
    if (!dom.alertStateEl) return;
    dom.alertStateEl.textContent = label;
    dom.alertStateEl.className = `tag ${className}`.trim();
  }

  function getMetricProfile() {
    if (state.metricSpikeUntil && Date.now() > state.metricSpikeUntil) {
      state.metricSpikeUntil = 0;
      state.metricProfile = state.perfRunning ? "load" : "normal";
    }
    const profile = state.metricProfile || "normal";
    return metricProfiles[profile] ? profile : "normal";
  }

  function updateMetrics() {
    if (!charts.length) {
      refreshCharts();
    }
    const profileKey = getMetricProfile();
    const profile = metricProfiles[profileKey];

    metricKeys.forEach((key) => {
      const rule = profile[key];
      if (!rule) return;
      state.metricState[key] = utils.clamp(
        state.metricState[key] + utils.randomBetween(rule.deltaMin, rule.deltaMax),
        rule.min,
        rule.max
      );
    });

    if (dom.reqRateEl) dom.reqRateEl.textContent = `${utils.formatNumber(state.metricState.reqRate)} rpm`;
    if (dom.errRateEl) dom.errRateEl.textContent = `${state.metricState.errRate.toFixed(2)}%`;
    if (dom.latencyEl) dom.latencyEl.textContent = `${Math.round(state.metricState.latency)} ms`;
    if (dom.apdexValueEl) dom.apdexValueEl.textContent = state.metricState.apdex.toFixed(2);
    if (dom.saturationValueEl) dom.saturationValueEl.textContent = `${Math.round(state.metricState.saturation)}%`;
    if (dom.cacheHitValueEl) dom.cacheHitValueEl.textContent = `${Math.round(state.metricState.cacheHit)}%`;

    charts.forEach((chart) => {
      if (!chart.key || !Number.isFinite(state.metricState[chart.key])) {
        drawSparkline(chart);
        return;
      }
      chart.values = utils.shiftValue(chart.values, state.metricState[chart.key]);
      metricSeries[chart.key] = chart.values;
      drawSparkline(chart);
    });

    const attention =
      state.metricState.errRate > 1.2 ||
      state.metricState.latency > 420 ||
      state.metricState.apdex < 0.9 ||
      state.metricState.saturation > 85 ||
      state.metricState.cacheHit < 90;

    if (attention) {
      updateAlertState("Attention", "warn");
    } else {
      updateAlertState("All Clear", "");
    }

    saveSession();
  }

  function drawSparkline({ canvas, color, values }) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padding = 6;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = `${color}22`;
    ctx.fill();
  }

  function drawAllSparklines() {
    if (!charts.length) {
      refreshCharts();
    }
    charts.forEach(drawSparkline);
  }

  dashboard.metrics = {
    updateMetrics,
    drawAllSparklines,
    refreshCharts,
  };
})();
