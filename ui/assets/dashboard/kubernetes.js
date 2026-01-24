(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { utils } = dashboard;
  const STORAGE_KEY = "devops-kube";

  let dom = {};
  let poolDom = {};

  function refreshDom() {
    dom = {
      badge: document.getElementById("kubeClusterBadge"),
      refreshBtn: document.getElementById("kubeRefresh"),
      failoverBtn: document.getElementById("kubeFailover"),
      upgradeBtn: document.getElementById("kubeUpgrade"),
      apiStatus: document.getElementById("kubeApiStatus"),
      etcdStatus: document.getElementById("kubeEtcdStatus"),
      schedulerStatus: document.getElementById("kubeSchedulerStatus"),
      hpaValue: document.getElementById("kubeHpaValue"),
      hpaMeta: document.getElementById("kubeHpaMeta"),
      autoscalerToggle: document.getElementById("kubeAutoscalerToggle"),
      pdbToggle: document.getElementById("kubePdbToggle"),
      hpaButtons: Array.from(document.querySelectorAll("[data-hpa-step]")),
      poolCards: Array.from(document.querySelectorAll("[data-kube-pool]")),
      poolActionButtons: Array.from(document.querySelectorAll("[data-pool-action]")),
    };

    poolDom = dom.poolCards.reduce((acc, card) => {
      const key = card.dataset.kubePool;
      if (!key) return acc;
      acc[key] = {
        status: card.querySelector("[data-pool-status]"),
        nodes: card.querySelector("[data-pool-nodes]"),
        usage: card.querySelector("[data-pool-usage]"),
        mode: card.querySelector("[data-pool-mode]"),
      };
      return acc;
    }, {});
  }

  const hpaRange = { min: 3, max: 12 };

  function clamp(value, min, max) {
    if (utils?.clamp) return utils.clamp(value, min, max);
    return Math.min(Math.max(value, min), max);
  }

  function randomBetween(min, max) {
    if (utils?.randomBetween) return utils.randomBetween(min, max);
    return Math.random() * (max - min) + min;
  }

  function buildDefaultState() {
    return {
      controlPlaneDegraded: false,
      upgradePlanned: false,
      autoscaler: true,
      pdb: true,
      hpaReplicas: 6,
      pools: {
        core: { desired: 6, ready: 6, cpu: 58, memory: 62, mode: "On-demand" },
        edge: { desired: 4, ready: 4, cpu: 44, memory: 48, mode: "Spot" },
        batch: { desired: 3, ready: 3, cpu: 38, memory: 40, mode: "Spot" },
      },
    };
  }

  function loadState() {
    const fallback = buildDefaultState();
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    try {
      const parsed = JSON.parse(stored);
      return {
        ...fallback,
        controlPlaneDegraded: Boolean(parsed.controlPlaneDegraded),
        upgradePlanned: Boolean(parsed.upgradePlanned),
        autoscaler: parsed.autoscaler !== false,
        pdb: parsed.pdb !== false,
        hpaReplicas: clamp(Number(parsed.hpaReplicas) || fallback.hpaReplicas, hpaRange.min, hpaRange.max),
        pools: Object.keys(fallback.pools).reduce((acc, key) => {
          const source = parsed.pools?.[key] || {};
          const desired = clamp(Number(source.desired) || fallback.pools[key].desired, 1, 12);
          acc[key] = {
            ...fallback.pools[key],
            desired,
            ready: clamp(Number(source.ready) || fallback.pools[key].ready, 0, desired),
            cpu: clamp(Number(source.cpu) || fallback.pools[key].cpu, 10, 96),
            memory: clamp(Number(source.memory) || fallback.pools[key].memory, 10, 96),
            mode: typeof source.mode === "string" ? source.mode : fallback.pools[key].mode,
          };
          return acc;
        }, {}),
      };
    } catch (error) {
      return fallback;
    }
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setTag(el, label, className) {
    if (!el) return;
    el.textContent = label;
    el.className = `tag ${className}`.trim();
  }

  function setChip(el, label, className) {
    if (utils?.setChip) {
      utils.setChip(el, label, className);
      return;
    }
    if (!el) return;
    el.textContent = label;
    el.classList.remove("success", "warn", "fail");
    if (className) el.classList.add(className);
  }

  function getPoolStatus(pool) {
    if (pool.ready <= 0) return { label: "Down", className: "fail" };
    if (pool.ready < pool.desired) return { label: "Draining", className: "warn" };
    return { label: "Ready", className: "success" };
  }

  function updateControlPlane() {
    if (state.controlPlaneDegraded) {
      setChip(dom.apiStatus, "Failover", "warn");
      setChip(dom.etcdStatus, "Re-electing", "warn");
      setChip(dom.schedulerStatus, "Resyncing", "warn");
      return;
    }
    setChip(dom.apiStatus, "Online", "success");
    setChip(dom.etcdStatus, "Healthy", "success");
    setChip(dom.schedulerStatus, "Synced", "success");
  }

  function updateHpa() {
    if (dom.hpaValue) {
      dom.hpaValue.textContent = `${state.hpaReplicas} pods`;
    }
    if (dom.hpaMeta) {
      dom.hpaMeta.textContent = `Target CPU: 65% | Min ${hpaRange.min} / Max ${hpaRange.max}`;
    }
    if (dom.autoscalerToggle) {
      dom.autoscalerToggle.checked = state.autoscaler;
    }
    if (dom.pdbToggle) {
      dom.pdbToggle.checked = state.pdb;
    }
  }

  function updatePools() {
    Object.entries(state.pools).forEach(([key, pool]) => {
      const refs = poolDom[key];
      if (!refs) return;
      const status = getPoolStatus(pool);
      setChip(refs.status, status.label, status.className);
      if (refs.nodes) {
        refs.nodes.textContent = `Nodes: ${pool.ready}/${pool.desired}`;
      }
      if (refs.usage) {
        refs.usage.textContent = `CPU ${pool.cpu}% / MEM ${pool.memory}%`;
      }
      if (refs.mode) {
        refs.mode.textContent = pool.mode;
      }
    });
  }

  function updateClusterBadge() {
    if (!dom.badge) return;
    const pools = Object.values(state.pools);
    const critical = pools.some((pool) => pool.ready <= 0);
    const degraded = pools.some((pool) => pool.ready < pool.desired) || state.controlPlaneDegraded;

    if (critical) {
      setTag(dom.badge, "Critical", "failed");
      return;
    }
    if (degraded) {
      setTag(dom.badge, "Degraded", "warn");
      return;
    }
    if (state.upgradePlanned) {
      setTag(dom.badge, "Upgrade Planned", "warn");
      return;
    }
    setTag(dom.badge, "Stable", "stable");
  }

  function refreshStats({ log = true } = {}) {
    Object.values(state.pools).forEach((pool) => {
      pool.cpu = clamp(Math.round(pool.cpu + randomBetween(-8, 8)), 20, 92);
      pool.memory = clamp(Math.round(pool.memory + randomBetween(-8, 8)), 20, 92);
    });
    saveState();
    updateUI();
    if (log) {
      utils?.pushLog?.("Kubernetes telemetry refreshed.");
    }
  }

  function handleFailover() {
    state.controlPlaneDegraded = !state.controlPlaneDegraded;
    saveState();
    updateUI();
    utils?.pushLog?.(
      state.controlPlaneDegraded ? "Control plane failover initiated." : "Control plane recovered."
    );
  }

  function handleUpgrade() {
    state.upgradePlanned = !state.upgradePlanned;
    saveState();
    updateUI();
    utils?.pushLog?.(
      state.upgradePlanned ? "Kubernetes upgrade plan scheduled." : "Kubernetes upgrade plan cleared."
    );
  }

  function handleHpaStep(delta) {
    const next = clamp(state.hpaReplicas + delta, hpaRange.min, hpaRange.max);
    if (next === state.hpaReplicas) return;
    state.hpaReplicas = next;
    saveState();
    updateHpa();
    updateClusterBadge();
    utils?.pushLog?.(`HPA adjusted to ${state.hpaReplicas} replicas.`);
  }

  function handleToggle(key, value, label) {
    state[key] = Boolean(value);
    saveState();
    updateHpa();
    updateClusterBadge();
    utils?.pushLog?.(`${label} ${state[key] ? "enabled" : "disabled"}.`);
  }

  function handlePoolAction(action, key) {
    const pool = state.pools[key];
    if (!pool) return;

    if (action === "scale") {
      pool.desired = clamp(pool.desired + 1, 1, 12);
      pool.ready = clamp(pool.ready + 1, 0, pool.desired);
      utils?.pushLog?.(`Scaled ${key} pool to ${pool.desired} nodes.`);
    }

    if (action === "drain") {
      pool.ready = clamp(pool.ready - 1, 0, pool.desired);
      utils?.pushLog?.(`Drained 1 node from ${key} pool.`);
    }

    saveState();
    updatePools();
    updateClusterBadge();
  }

  function updateUI() {
    if (!dom.badge) {
      refreshDom();
    }
    if (!dom.badge) return;
    updateControlPlane();
    updateHpa();
    updatePools();
    updateClusterBadge();
  }

  function init() {
    refreshDom();
    if (!dom.badge) return;

    dom.refreshBtn?.addEventListener("click", () => refreshStats({ log: true }));
    dom.failoverBtn?.addEventListener("click", handleFailover);
    dom.upgradeBtn?.addEventListener("click", handleUpgrade);
    dom.hpaButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const delta = Number(button.dataset.hpaStep || 0);
        if (Number.isFinite(delta)) {
          handleHpaStep(delta);
        }
      });
    });
    dom.autoscalerToggle?.addEventListener("change", (event) => {
      handleToggle("autoscaler", event.target.checked, "Cluster autoscaler");
    });
    dom.pdbToggle?.addEventListener("change", (event) => {
      handleToggle("pdb", event.target.checked, "Pod disruption budget");
    });
    dom.poolActionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.poolAction;
        const target = button.dataset.poolTarget;
        if (action && target) {
          handlePoolAction(action, target);
        }
      });
    });

    updateUI();
  }

  dashboard.kubernetes = {
    init,
    updateUI,
    refreshStats,
  };
})();
