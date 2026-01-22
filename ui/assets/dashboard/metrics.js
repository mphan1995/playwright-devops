(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, state, utils } = dashboard;

  const charts = Array.from(document.querySelectorAll(".spark")).map((canvas) => ({
    canvas,
    color: canvas.dataset.color || "#47d7c3",
    values: utils.seedValues(22, 60, 100),
  }));

  function updateAlertState(label, className) {
    if (!dom.alertStateEl) return;
    dom.alertStateEl.textContent = label;
    dom.alertStateEl.className = `tag ${className}`.trim();
  }

  function updateMetrics() {
    state.metricState.reqRate = utils.clamp(state.metricState.reqRate + utils.randomBetween(-60, 80), 980, 1600);
    state.metricState.errRate = utils.clamp(state.metricState.errRate + utils.randomBetween(-0.08, 0.1), 0.2, 1.6);
    state.metricState.latency = utils.clamp(state.metricState.latency + utils.randomBetween(-18, 24), 160, 360);

    if (dom.reqRateEl) dom.reqRateEl.textContent = `${utils.formatNumber(state.metricState.reqRate)} rpm`;
    if (dom.errRateEl) dom.errRateEl.textContent = `${state.metricState.errRate.toFixed(2)}%`;
    if (dom.latencyEl) dom.latencyEl.textContent = `${Math.round(state.metricState.latency)} ms`;

    if (charts.length >= 3) {
      charts[0].values = utils.shiftValue(charts[0].values, state.metricState.reqRate / 20);
      charts[1].values = utils.shiftValue(charts[1].values, state.metricState.errRate * 60);
      charts[2].values = utils.shiftValue(charts[2].values, state.metricState.latency / 4);
    }

    charts.forEach(drawSparkline);

    if (state.metricState.errRate > 1.2) {
      updateAlertState("Attention", "warn");
    } else {
      updateAlertState("All Clear", "");
    }
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
    charts.forEach(drawSparkline);
  }

  dashboard.metrics = {
    updateMetrics,
    drawAllSparklines,
  };
})();
