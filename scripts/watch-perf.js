const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const watchTargets = [
  { dir: path.join(rootDir, "tests", "performance"), extensions: new Set([".json"]) },
  { dir: path.join(rootDir, "ui", "pages"), extensions: new Set([".html"]) },
  { dir: path.join(rootDir, "ui", "components"), extensions: new Set([".html"]) },
  { dir: path.join(rootDir, "ui", "assets"), extensions: new Set([".js", ".css"]) },
  { dir: path.join(rootDir, "ui", "assets", "dashboard"), extensions: new Set([".js"]) },
  { dir: path.join(rootDir, "ui", "assets", "css"), extensions: new Set([".css"]) },
];

let debounceTimer = null;
let running = false;
let rerun = false;

function runCommand(args) {
  return new Promise((resolve) => {
    const child = spawn(npmCmd, args, {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env },
    });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function runPerf() {
  if (running) {
    rerun = true;
    return;
  }

  running = true;
  await runCommand(["run", "test:perf"]);
  await runCommand(["run", "test:signals"]);
  running = false;

  if (rerun) {
    rerun = false;
    runPerf();
  }
}

function scheduleRun() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    runPerf();
  }, 600);
}

watchTargets.forEach(({ dir, extensions }) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.watch(dir, (event, filename) => {
    if (!filename) return;
    const ext = path.extname(filename);
    if (!extensions.has(ext)) return;
    scheduleRun();
  });
});

console.log("Watching release inputs for performance regression...");
