(() => {
  if (document.body.dataset.page !== "services") {
    return;
  }

const serviceGrid = document.getElementById("serviceGrid");
const serviceBanner = document.getElementById("serviceBanner");
const serviceEmpty = document.getElementById("serviceEmpty");
const criticalCountEl = document.getElementById("criticalCount");
const degradedCountEl = document.getElementById("degradedCount");
const serviceUpdatedEl = document.getElementById("serviceUpdated");
const toggleFailureBtn = document.getElementById("toggleServiceFailure");
const retryBtn = document.getElementById("retryServiceLoad");

const SERVICE_FAIL_KEY = "devops-services-fail";

const baseServices = [
  {
    name: "api-gateway",
    status: "healthy",
    latency: "120 ms",
    traffic: "2.1k rpm",
  },
  {
    name: "auth-service",
    status: "healthy",
    latency: "98 ms",
    traffic: "840 rpm",
  },
  {
    name: "checkout-service",
    status: "degraded",
    latency: "310 ms",
    traffic: "620 rpm",
  },
  {
    name: "inventory",
    status: "healthy",
    latency: "140 ms",
    traffic: "1.5k rpm",
  },
  {
    name: "notifications",
    status: "healthy",
    latency: "76 ms",
    traffic: "430 rpm",
  },
  {
    name: "edge-cache",
    status: "healthy",
    latency: "18 ms",
    traffic: "5.2k rpm",
  },
];

const statusMap = {
  healthy: { label: "Healthy", className: "success" },
  degraded: { label: "Degraded", className: "warn" },
  down: { label: "Down", className: "fail" },
  unknown: { label: "Unknown", className: "warn" },
};

function getFailureFlag() {
  return localStorage.getItem(SERVICE_FAIL_KEY) === "true";
}

function setFailureFlag(value) {
  localStorage.setItem(SERVICE_FAIL_KEY, value ? "true" : "false");
}

function isForcedFailure() {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("fail");
  return forced === "1" || forced === "true";
}

function shouldFail() {
  return isForcedFailure() || getFailureFlag();
}

function updateBanner(state, message) {
  if (!serviceBanner) return;
  serviceBanner.textContent = message;
  serviceBanner.classList.remove("degraded", "failed");
  if (state === "degraded") {
    serviceBanner.classList.add("degraded");
  }
  if (state === "failed") {
    serviceBanner.classList.add("failed");
  }
}

function renderServices(services) {
  if (!serviceGrid) return;
  serviceGrid.innerHTML = "";

  services.forEach((service) => {
    const status = statusMap[service.status] || statusMap.unknown;
    const card = document.createElement("div");
    card.className = "service-card";
    card.innerHTML = `
      <h4>${service.name}</h4>
      <div class="service-status">
        <span>Latency: ${service.latency}</span>
        <span class="status-chip ${status.className}">${status.label}</span>
      </div>
      <div class="service-status">
        <span>Traffic: ${service.traffic}</span>
        <span>Zone: ap-southeast-1</span>
      </div>
    `;
    serviceGrid.appendChild(card);
  });

  const degradedCount = services.filter((service) => service.status !== "healthy").length;
  if (criticalCountEl) criticalCountEl.textContent = String(services.length);
  if (degradedCountEl) degradedCountEl.textContent = String(degradedCount);
  if (serviceUpdatedEl) {
    serviceUpdatedEl.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
  }
}

function renderFailure() {
  if (!serviceGrid) return;
  const fallback = baseServices.slice(0, 4).map((service) => ({
    ...service,
    status: "unknown",
    latency: "n/a",
    traffic: "n/a",
  }));

  renderServices(fallback);
  updateBanner("failed", "Telemetry feed offline. Showing last cached snapshot.");

  if (serviceEmpty) {
    serviceEmpty.hidden = false;
  }
}

function resetFailureView() {
  if (serviceEmpty) {
    serviceEmpty.hidden = true;
  }
}

function simulateFetch() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail()) {
        reject(new Error("Telemetry feed offline"));
        return;
      }
      resolve(baseServices);
    }, 600);
  });
}

function updateToggleLabel() {
  if (!toggleFailureBtn) return;
  if (isForcedFailure()) {
    toggleFailureBtn.textContent = "Failure Locked";
    toggleFailureBtn.disabled = true;
    return;
  }

  toggleFailureBtn.disabled = false;
  const locked = shouldFail();
  toggleFailureBtn.textContent = locked ? "Disable Failure" : "Simulate Failure";
}

async function loadServices() {
  resetFailureView();
  updateBanner("healthy", "Telemetry feed healthy.");

  try {
    const data = await simulateFetch();
    renderServices(data);
    const degradedCount = data.filter((service) => service.status === "degraded").length;
    if (degradedCount > 0) {
      updateBanner("degraded", "Degraded services detected. Fallbacks enabled.");
    }
  } catch (error) {
    renderFailure();
  } finally {
    updateToggleLabel();
  }
}

if (toggleFailureBtn) {
  toggleFailureBtn.addEventListener("click", () => {
    if (isForcedFailure()) {
      return;
    }
    setFailureFlag(!getFailureFlag());
    loadServices();
  });
}

if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    loadServices();
  });
}

loadServices();
})();
