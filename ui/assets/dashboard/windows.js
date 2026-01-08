(() => {
  const dashboard = window.devopsDashboard;
  if (!dashboard) {
    return;
  }

  const { dom, state, config, utils } = dashboard;

  function getMinutesUtc(date) {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  function isWithinWindow(minutes, start, end) {
    if (start <= end) {
      return minutes >= start && minutes < end;
    }
    return minutes >= start || minutes < end;
  }

  function getBaseWindows() {
    const now = new Date();
    const minutes = getMinutesUtc(now);
    const day = now.getUTCDay();

    const deployment = isWithinWindow(
      minutes,
      config.windowSchedule.deployment.start,
      config.windowSchedule.deployment.end
    );
    const maintenance = isWithinWindow(
      minutes,
      config.windowSchedule.maintenance.start,
      config.windowSchedule.maintenance.end
    );
    const freeze = config.windowSchedule.freeze.weekendOnly ? day === 0 || day === 6 : false;

    return { deployment, maintenance, freeze };
  }

  function getEffectiveWindows() {
    const base = getBaseWindows();
    return {
      deployment:
        state.windowOverrides.deployment === null ? base.deployment : state.windowOverrides.deployment,
      maintenance:
        state.windowOverrides.maintenance === null ? base.maintenance : state.windowOverrides.maintenance,
      freeze: state.windowOverrides.freeze === null ? base.freeze : state.windowOverrides.freeze,
      base,
    };
  }

  function updateWindowUI() {
    const { deployment, maintenance, freeze, base } = getEffectiveWindows();

    utils.setChip(dom.deploymentWindowStatusEl, deployment ? "Open" : "Closed", deployment ? "success" : "warn");
    utils.setChip(dom.maintenanceWindowStatusEl, maintenance ? "Active" : "Inactive", maintenance ? "warn" : "success");
    utils.setChip(dom.freezeWindowStatusEl, freeze ? "Active" : "Inactive", freeze ? "fail" : "success");

    dom.windowToggleButtons.forEach((button) => {
      const key = button.dataset.windowToggle;
      const override = state.windowOverrides[key];
      button.textContent = override === null ? "Override" : "Auto";
    });

    const overrideCount = Object.values(state.windowOverrides).filter((value) => value !== null).length;
    if (dom.windowNoteEl) {
      dom.windowNoteEl.textContent =
        overrideCount > 0
          ? `Override active (${overrideCount}) - base schedule still tracked in UTC.`
          : "Auto schedule in UTC, override for testing.";
    }

    if (dom.windowBadgeEl) {
      if (freeze) {
        dom.windowBadgeEl.textContent = "Freeze Active";
        dom.windowBadgeEl.className = "tag failed";
      } else if (maintenance) {
        dom.windowBadgeEl.textContent = "Maintenance";
        dom.windowBadgeEl.className = "tag warn";
      } else if (!deployment) {
        dom.windowBadgeEl.textContent = "Window Closed";
        dom.windowBadgeEl.className = "tag queued";
      } else if (overrideCount > 0 && (deployment !== base.deployment || maintenance !== base.maintenance || freeze !== base.freeze)) {
        dom.windowBadgeEl.textContent = "Override";
        dom.windowBadgeEl.className = "tag paused";
      } else {
        dom.windowBadgeEl.textContent = "On Schedule";
        dom.windowBadgeEl.className = "tag stable";
      }
    }
  }

  function toggleWindowOverride(key) {
    const base = getBaseWindows();
    if (state.windowOverrides[key] === null) {
      state.windowOverrides[key] = !base[key];
    } else {
      state.windowOverrides[key] = null;
    }
    utils.saveWindowOverrides(state.windowOverrides);
    updateWindowUI();
  }

  dashboard.windows = {
    updateWindowUI,
    toggleWindowOverride,
  };
})();
