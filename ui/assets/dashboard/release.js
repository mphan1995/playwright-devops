(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, state, config, storage, utils } = dashboard;

  function updateStepStatus(index, status) {
    const step = dom.stepEls[index];
    if (!step) return;
    step.dataset.status = status;
    const label = step.querySelector(".step-status");
    if (label) {
      label.textContent = config.pipelineLabels[status] || status;
    }
  }

  function setPipelineQueued() {
    if (!dom.stepEls.length) return;
    state.currentIndex = 0;
    dom.stepEls.forEach((_, index) => updateStepStatus(index, "queued"));
    localStorage.setItem(storage.step, String(state.currentIndex));
  }

  function setPipelineSucceeded() {
    if (!dom.stepEls.length) return;
    state.currentIndex = Math.max(dom.stepEls.length - 1, 0);
    dom.stepEls.forEach((_, index) => updateStepStatus(index, "success"));
    localStorage.setItem(storage.step, String(state.currentIndex));
  }

  function setPipelineFailed() {
    if (!dom.stepEls.length) return;
    if (state.currentIndex >= dom.stepEls.length) {
      state.currentIndex = dom.stepEls.length - 1;
    }
    dom.stepEls.forEach((_, index) => {
      const status =
        index < state.currentIndex ? "success" : index === state.currentIndex ? "failed" : "queued";
      updateStepStatus(index, status);
    });
    localStorage.setItem(storage.step, String(state.currentIndex));
  }

  function syncPipeline() {
    if (!dom.stepEls.length) return;
    if (state.currentIndex >= dom.stepEls.length || state.currentIndex < 0) {
      state.currentIndex = 0;
    }
    dom.stepEls.forEach((_, index) => {
      const status =
        index < state.currentIndex ? "success" : index === state.currentIndex ? "running" : "queued";
      updateStepStatus(index, status);
    });
    localStorage.setItem(storage.step, String(state.currentIndex));
  }

  function updateReleaseTags() {
    const label = config.statusLabels[state.releaseState] || state.releaseState;
    const className = config.statusClasses[state.releaseState] || "";

    [dom.runStateEl, dom.releaseStateBadgeEl].forEach((el) => {
      if (!el) return;
      el.textContent = label;
      el.className = `tag ${className}`.trim();
    });

    dom.stateItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.state === state.releaseState);
    });
  }

  function setReleaseState(nextState, reason) {
    if (!config.statusLabels[nextState]) return;
    const previous = state.releaseState;
    state.releaseState = nextState;
    localStorage.setItem(storage.releaseState, state.releaseState);

    if (reason && previous !== nextState) {
      utils.pushLog(`${config.statusLabels[nextState]}: ${reason}`);
    }

    updateReleaseTags();
    updateControlState();

    const shouldRun = state.releaseState === "running";
    if (state.simulationOn !== shouldRun) {
      state.simulationOn = shouldRun;
      window.devopsApp?.setSimulationState?.(state.simulationOn);
    }

    if (state.releaseState === "queued") {
      setPipelineQueued();
      return;
    }

    if (state.releaseState === "succeeded") {
      setPipelineSucceeded();
      return;
    }

    if (state.releaseState === "failed" || state.releaseState === "rolled-back") {
      setPipelineFailed();
      return;
    }

    if (state.releaseState === "running") {
      syncPipeline();
    }
  }

  function evaluatePolicies() {
    const approvalsOk = state.approvals >= 2;
    const driftOk = !state.incidents.terraformDrift;
    const canaryOk = !state.incidents.canaryFailed;
    return { approvalsOk, driftOk, canaryOk };
  }

  function updatePolicySignals() {
    const { approvalsOk, driftOk, canaryOk } = evaluatePolicies();

    if (dom.policyApprovalsEl) {
      dom.policyApprovalsEl.textContent = approvalsOk ? "Passing" : "Pending";
      dom.policyApprovalsEl.className = `policy-status ${approvalsOk ? "success" : "warn"}`.trim();
    }

    if (dom.policyDriftEl) {
      dom.policyDriftEl.textContent = driftOk ? "Passing" : "Failing";
      dom.policyDriftEl.className = `policy-status ${driftOk ? "success" : "fail"}`.trim();
    }

    if (dom.policyCanaryEl) {
      dom.policyCanaryEl.textContent = canaryOk ? "Passing" : "Failing";
      dom.policyCanaryEl.className = `policy-status ${canaryOk ? "success" : "fail"}`.trim();
    }

    if (dom.approvalCountEl) {
      dom.approvalCountEl.textContent = `${state.approvals}/2`;
    }

    return { approvalsOk, driftOk, canaryOk };
  }

  function getIncidentBlocks() {
    const reasons = [];
    if (state.incidents.terraformDrift) reasons.push("Terraform drift detected");
    if (state.incidents.jenkinsQueue) reasons.push("Jenkins queue full");
    if (state.incidents.jenkinsNode) reasons.push("Jenkins node down");
    if (state.incidents.serviceUnhealthy) reasons.push("Service unhealthy");
    return reasons;
  }

  function getBlockingReasons() {
    const reasons = [];
    if (state.approvals < 2) reasons.push("Approvals pending");
    return reasons.concat(getIncidentBlocks());
  }

  function getCriticalReason() {
    if (state.incidents.deploymentTimeout) return "Deployment timeout detected";
    if (state.incidents.canaryFailed) return "Canary failed";
    return "";
  }

  function applyReleaseConstraints() {
    const criticalReason = getCriticalReason();
    if (criticalReason && ["running", "queued", "blocked"].includes(state.releaseState)) {
      setReleaseState("failed", criticalReason);
      return;
    }

    if (["running", "queued"].includes(state.releaseState)) {
      const reasons = getIncidentBlocks();
      if (reasons.length) {
        setReleaseState("blocked", reasons[0]);
      }
    }
  }

  function updateControlState() {
    if (dom.pauseReleaseBtn) {
      dom.pauseReleaseBtn.disabled = state.releaseState !== "running";
    }

    if (dom.resumeReleaseBtn) {
      dom.resumeReleaseBtn.disabled = !["paused", "blocked", "queued"].includes(state.releaseState);
    }

    if (dom.approveReleaseBtn) {
      dom.approveReleaseBtn.disabled =
        state.approvals >= 2 || ["succeeded", "failed", "rolled-back"].includes(state.releaseState);
    }

    if (dom.rejectReleaseBtn) {
      dom.rejectReleaseBtn.disabled = ["succeeded", "rolled-back"].includes(state.releaseState);
    }

    if (dom.rollbackReleaseBtn) {
      dom.rollbackReleaseBtn.disabled = state.releaseState === "queued";
    }
  }

  function syncRunMetadata() {
    if (dom.buildIdEl) dom.buildIdEl.textContent = `REL-${state.runNumber}`;
    if (dom.commitEl) dom.commitEl.textContent = state.commitHash;
  }

  function startNewRun(reason) {
    state.runNumber += 1;
    state.commitHash = utils.randomHash();
    localStorage.setItem(storage.runId, String(state.runNumber));
    localStorage.setItem(storage.commit, state.commitHash);
    localStorage.setItem(storage.step, "0");
    state.currentIndex = 0;

    if (dom.buildIdEl) dom.buildIdEl.textContent = `REL-${state.runNumber}`;
    if (dom.commitEl) dom.commitEl.textContent = state.commitHash;
    utils.pushLog(`Release REL-${state.runNumber} queued. ${reason}`);
  }

  function advancePipeline() {
    if (!state.simulationOn || state.releaseState !== "running") return;
    if (!dom.stepEls.length) return;

    updateStepStatus(state.currentIndex, "success");
    utils.pushLog(`${dom.stepEls[state.currentIndex].querySelector(".step-title").textContent} completed.`);

    state.currentIndex += 1;
    if (state.currentIndex >= dom.stepEls.length) {
      setReleaseState("succeeded", "Release completed successfully.");
      return;
    }

    updateStepStatus(state.currentIndex, "running");
    for (let i = state.currentIndex + 1; i < dom.stepEls.length; i += 1) {
      updateStepStatus(i, "queued");
    }

    localStorage.setItem(storage.step, String(state.currentIndex));
  }

  function getRole() {
    return window.devopsApp?.getRole?.() || document.documentElement.dataset.role || "user";
  }

  function handleTrigger() {
    if (getRole() !== "admin") return;
    state.approvals = 0;
    localStorage.setItem(storage.approvals, String(state.approvals));
    updatePolicySignals();
    startNewRun("Manual trigger");
    setReleaseState("queued", "Release triggered by admin");
    applyReleaseConstraints();
  }

  function handlePause() {
    if (getRole() !== "admin") return;
    setReleaseState("paused", "Release paused by admin");
  }

  function handleResume() {
    const role = getRole();
    if (!["admin", "operator"].includes(role)) return;

    const criticalReason = getCriticalReason();
    if (criticalReason) {
      setReleaseState("failed", criticalReason);
      return;
    }

    const reasons = getBlockingReasons();
    if (reasons.length) {
      setReleaseState("blocked", `Resume blocked: ${reasons[0]}`);
      return;
    }

    setReleaseState("running", "Release resumed");
  }

  function handleApprove() {
    if (getRole() !== "admin") return;
    if (state.approvals >= 2) return;
    state.approvals += 1;
    localStorage.setItem(storage.approvals, String(state.approvals));
    updatePolicySignals();
    utils.pushLog(`Approval recorded (${state.approvals}/2).`);

    const { approvalsOk } = evaluatePolicies();
    if (approvalsOk && ["queued", "blocked"].includes(state.releaseState)) {
      const criticalReason = getCriticalReason();
      if (criticalReason) {
        setReleaseState("failed", criticalReason);
        return;
      }
      const reasons = getBlockingReasons();
      if (reasons.length) {
        setReleaseState("blocked", `Policy blocked: ${reasons[0]}`);
        return;
      }
      setReleaseState("running", "Approval threshold reached");
    }
  }

  function handleReject() {
    if (getRole() !== "admin") return;
    state.approvals = 0;
    localStorage.setItem(storage.approvals, String(state.approvals));
    updatePolicySignals();
    setReleaseState("blocked", "Release rejected by admin");
  }

  function handleRollback() {
    if (getRole() !== "admin") return;
    setReleaseState("rolled-back", "Rollback executed");
  }

  dashboard.release = {
    updateReleaseTags,
    updatePolicySignals,
    updateControlState,
    applyReleaseConstraints,
    syncRunMetadata,
    syncPipeline,
    setPipelineQueued,
    setPipelineSucceeded,
    setPipelineFailed,
    setReleaseState,
    advancePipeline,
    handleTrigger,
    handlePause,
    handleResume,
    handleApprove,
    handleReject,
    handleRollback,
  };
})();
