const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const playwrightBin = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "playwright.cmd" : "playwright"
);
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
  const testExit = await runCommand(playwrightBin, ["test", ...args]);
  const signalExit = await runCommand(process.execPath, [signalScript]);
  process.exitCode = testExit !== 0 ? testExit : signalExit;
}

main();
