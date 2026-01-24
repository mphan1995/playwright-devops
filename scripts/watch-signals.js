const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const signalScript = path.join(rootDir, "scripts", "build-release-signals.js");

const watchTargets = [
  { dir: path.join(rootDir, "test-results"), files: new Set([".last-run.json"]) },
  { dir: path.join(rootDir, "test-results", "ui"), files: new Set(["ui-results.json"]) },
  { dir: path.join(rootDir, "test-results", "performance"), files: new Set(["perf-results.json"]) },
];

let debounceTimer = null;
let running = false;
let rerun = false;

function runSignals() {
  if (running) {
    rerun = true;
    return;
  }

  running = true;
  const child = spawn(process.execPath, [signalScript], {
    cwd: rootDir,
    stdio: "inherit",
  });

  child.on("exit", () => {
    running = false;
    if (rerun) {
      rerun = false;
      runSignals();
    }
  });
}

function scheduleRun() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runSignals, 300);
}

watchTargets.forEach(({ dir, files }) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.watch(dir, (event, filename) => {
    if (!filename || !files.has(filename)) {
      return;
    }
    scheduleRun();
  });
});

runSignals();
console.log("Watching test results for signal updates...");
