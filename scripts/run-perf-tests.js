const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const perfScript = path.join(rootDir, "tests", "performance", "run-performance.js");
const signalScript = path.join(rootDir, "scripts", "build-release-signals.js");

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env },
    });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

async function main() {
  const args = process.argv.slice(2);
  const perfExit = await runCommand(process.execPath, [perfScript, ...args]);
  const signalExit = await runCommand(process.execPath, [signalScript]);
  process.exitCode = perfExit !== 0 ? perfExit : signalExit;
}

main();
