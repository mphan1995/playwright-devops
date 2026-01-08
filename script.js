const stepEls = Array.from(document.querySelectorAll(".step"));
const runStateEl = document.getElementById("runState");
const buildIdEl = document.getElementById("buildId");
const commitEl = document.getElementById("commitHash");
const logList = document.getElementById("logList");
const alertStateEl = document.getElementById("alertState");
const qaStateEl = document.getElementById("qaState");

const reqRateEl = document.getElementById("reqRate");
const errRateEl = document.getElementById("errRate");
const latencyEl = document.getElementById("latency");

const qaTotalEl = document.getElementById("qaTotal");
const qaPassedEl = document.getElementById("qaPassed");
const qaFailedEl = document.getElementById("qaFailed");
const qaFlakyEl = document.getElementById("qaFlaky");
const qaDurationEl = document.getElementById("qaDuration");
const qaCoverageEl = document.getElementById("qaCoverage");

const statusLabels = {
  queued: "Queued",
  running: "Running",
  success: "Success",
  failed: "Failed",
};

let simulationOn = true;
let currentIndex = 2;
let runNumber = 2406;

const metricState = {
  reqRate: 1240,
  errRate: 0.62,
  latency: 240,
};

const qaState = {
  total: 128,
  passed: 126,
  failed: 2,
  flaky: 1,
  duration: 192,
  coverage: 82,
};

const charts = Array.from(document.querySelectorAll(".spark")).map((canvas) => ({
  canvas,
  color: canvas.dataset.color || "#47d7c3",
  values: seedValues(22, 60, 100),
}));

function seedValues(count, min, max) {
  return Array.from({ length: count }, () => randomBetween(min, max));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomHash(length = 7) {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function updateStepStatus(index, status) {
  const step = stepEls[index];
  if (!step) return;
  step.dataset.status = status;
  const label = step.querySelector(".step-status");
  if (label) {
    label.textContent = statusLabels[status] || status;
  }
}

function resetPipeline() {
  stepEls.forEach((_, index) => {
    const status = index === 0 ? "running" : "queued";
    updateStepStatus(index, status);
  });
  currentIndex = 0;
  setRunState("Running", "running");
}

function setRunState(label, className) {
  runStateEl.textContent = label;
  runStateEl.className = `tag ${className}`.trim();
}

function updateAlertState(label, className) {
  alertStateEl.textContent = label;
  alertStateEl.className = `tag ${className}`.trim();
}

function updateQaState(label, className) {
  qaStateEl.textContent = label;
  qaStateEl.className = `tag ${className}`.trim();
}

function advancePipeline() {
  if (!simulationOn) return;

  updateStepStatus(currentIndex, "success");
  pushLog(`${stepEls[currentIndex].querySelector(".step-title").textContent} completed.`);

  currentIndex += 1;
  if (currentIndex >= stepEls.length) {
    startNewRun("Auto-rollover after success");
    resetPipeline();
    return;
  }

  updateStepStatus(currentIndex, "running");
  for (let i = currentIndex + 1; i < stepEls.length; i += 1) {
    updateStepStatus(i, "queued");
  }
}

function startNewRun(reason) {
  runNumber += 1;
  buildIdEl.textContent = `REL-${runNumber}`;
  commitEl.textContent = randomHash();
  pushLog(`Release REL-${runNumber} queued. ${reason}`);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function updateMetrics() {
  metricState.reqRate = clamp(metricState.reqRate + randomBetween(-60, 80), 980, 1600);
  metricState.errRate = clamp(metricState.errRate + randomBetween(-0.08, 0.1), 0.2, 1.6);
  metricState.latency = clamp(metricState.latency + randomBetween(-18, 24), 160, 360);

  reqRateEl.textContent = `${formatNumber(metricState.reqRate)} rpm`;
  errRateEl.textContent = `${metricState.errRate.toFixed(2)}%`;
  latencyEl.textContent = `${Math.round(metricState.latency)} ms`;

  charts[0].values = shiftValue(charts[0].values, metricState.reqRate / 20);
  charts[1].values = shiftValue(charts[1].values, metricState.errRate * 60);
  charts[2].values = shiftValue(charts[2].values, metricState.latency / 4);

  charts.forEach(drawSparkline);

  if (metricState.errRate > 1.2) {
    updateAlertState("Attention", "warn");
  } else {
    updateAlertState("All Clear", "");
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function shiftValue(values, nextValue) {
  const updated = values.slice(1);
  updated.push(nextValue);
  return updated;
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

function updateQaMetrics() {
  qaState.duration = clamp(qaState.duration + randomBetween(-5, 6), 160, 260);
  qaState.coverage = clamp(qaState.coverage + randomBetween(-1, 1.2), 80, 90);

  qaDurationEl.textContent = `${Math.floor(qaState.duration / 60)}m ${Math.round(qaState.duration % 60)}s`;
  qaCoverageEl.textContent = `${Math.round(qaState.coverage)}%`;

  const passRate = qaState.passed / qaState.total;
  if (passRate < 0.95 || qaState.failed > 3) {
    updateQaState("Risk", "warn");
  } else {
    updateQaState("Green", "");
  }
}

function pushLog(message) {
  const timestamp = new Date().toLocaleTimeString("en-GB", {
    hour12: false,
  });
  const entry = document.createElement("li");
  entry.textContent = `[${timestamp}] ${message}`;
  logList.prepend(entry);
  while (logList.children.length > 8) {
    logList.removeChild(logList.lastChild);
  }
}

const triggerRunBtn = document.getElementById("triggerRun");
const toggleSimBtn = document.getElementById("toggleSim");

triggerRunBtn.addEventListener("click", () => {
  startNewRun("Manual trigger");
  resetPipeline();
});

toggleSimBtn.addEventListener("click", () => {
  simulationOn = !simulationOn;
  toggleSimBtn.textContent = simulationOn ? "Pause Simulation" : "Resume Simulation";
  setRunState(simulationOn ? "Running" : "Paused", simulationOn ? "running" : "paused");
});

window.addEventListener("resize", () => {
  charts.forEach(drawSparkline);
});

setInterval(advancePipeline, 4200);
setInterval(updateMetrics, 2000);
setInterval(updateQaMetrics, 4200);

updateMetrics();
updateQaMetrics();
