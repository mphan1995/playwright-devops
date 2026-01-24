(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, utils } = dashboard;
  const statusClasses = {
    pass: "succeeded",
    warn: "warn",
    fail: "failed",
    unknown: "",
  };

  function setText(el, value, fallback = "N/A") {
    if (!el) return;
    if (value === null || value === undefined || value === "") {
      el.textContent = fallback;
      return;
    }
    el.textContent = String(value);
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "N/A";
    if (utils?.formatNumber) return utils.formatNumber(value);
    return String(Math.round(value));
  }

  function formatMs(value) {
    if (!Number.isFinite(value)) return "N/A";
    return `${Math.round(value)} ms`;
  }

  function formatRps(value) {
    if (!Number.isFinite(value)) return "N/A";
    return `${formatNumber(value)} rps`;
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "N/A";
    return `${(value * 100).toFixed(2)}%`;
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms)) return "N/A";
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}m ${seconds}s`;
  }

  function formatTimestamp(isoString) {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toISOString().replace("T", " ").replace("Z", " UTC");
  }

  function setTag(el, prefix, summary) {
    if (!el) return;
    const label = summary?.label || "No Data";
    const status = summary?.status || "unknown";
    const className = statusClasses[status] || "";
    const text = prefix ? `${prefix}: ${label}` : label;

    el.textContent = text;
    el.className = "tag";
    if (className) {
      el.classList.add(className);
    }
  }

  function renderUi(summary, metaLabel) {
    const totals = summary?.totals || {};
    setTag(dom.qaStateEl, "UI", summary);
    setText(dom.qaTotalEl, totals.total);
    setText(dom.qaPassedEl, totals.passed);
    setText(dom.qaFailedEl, totals.failed);
    setText(dom.qaSkippedEl, totals.skipped);
    setText(dom.qaFlakyEl, totals.flaky);
    setText(dom.qaDurationEl, formatDuration(summary?.durationMs));
    if (dom.uiSummaryMetaEl) {
      dom.uiSummaryMetaEl.textContent = metaLabel;
    }
  }

  function renderPerformance(summary, metaLabel) {
    const scenarios = summary?.scenarios || {};
    const highlights = summary?.highlights || {};

    setTag(dom.perfStateEl, "Perf", summary);
    setText(dom.perfScenarioTotalEl, scenarios.total);
    setText(dom.perfScenarioFailedEl, scenarios.failed);
    setText(dom.perfWorstAvgEl, formatMs(highlights.avgMs));
    setText(dom.perfWorstP95El, formatMs(highlights.p95Ms));
    setText(dom.perfMinRpsEl, formatRps(highlights.rps));
    setText(dom.perfErrorRateEl, formatPercent(highlights.errorRate));

    if (dom.perfSummaryMetaEl) {
      dom.perfSummaryMetaEl.textContent = metaLabel;
    }
  }

  let lastSignature = null;
  let pollHandle = null;

  function getSignature(data) {
    if (data?.generatedAt) return data.generatedAt;
    return JSON.stringify({
      ui: data?.ui?.summary || null,
      performance: data?.performance?.summary || null,
    });
  }

  async function loadSignals({ force = false } = {}) {
    const source = document.body.dataset.signalsSrc || "../data/release-signals.json";
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Signal fetch failed.");
      }
      const data = await response.json();
      const signature = getSignature(data);
      if (!force && signature && signature === lastSignature) {
        return;
      }
      lastSignature = signature || null;
      const metaLabel = `Updated: ${formatTimestamp(data?.generatedAt)}`;

      renderUi(data?.ui?.summary, metaLabel);
      renderPerformance(data?.performance?.summary, metaLabel);

      if (dom.signalFooterEl) {
        dom.signalFooterEl.textContent = `Signals updated: ${formatTimestamp(data?.generatedAt)}`;
      }
    } catch (error) {
      const metaLabel = "Updated: N/A";
      renderUi(null, metaLabel);
      renderPerformance(null, metaLabel);
      if (dom.signalFooterEl) {
        dom.signalFooterEl.textContent = "Signals unavailable";
      }
    }
  }

  function startPolling() {
    const pollMs = Number(document.body.dataset.signalsPoll) || 10000;
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }

    loadSignals({ force: true });
    if (pollMs <= 0) {
      return;
    }

    pollHandle = window.setInterval(() => {
      if (document.hidden) return;
      loadSignals();
    }, pollMs);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        loadSignals();
      }
    });
  }

  dashboard.signals = {
    loadSignals,
    startPolling,
  };
})();
