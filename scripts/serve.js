const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const basePort = Number(process.env.PORT) || 8080;
const maxTries = 10;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.on("error", () => {
      resolve(false);
    });

    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickPort(startPort, tries) {
  for (let i = 0; i < tries; i += 1) {
    const port = startPort + i;
    if (await isPortFree(port)) {
      return port;
    }
  }
  return null;
}

async function main() {
  const port = await pickPort(basePort, maxTries);
  if (!port) {
    console.error(`No free port found from ${basePort} to ${basePort + maxTries - 1}.`);
    process.exit(1);
  }

  const bin = path.join(
    rootDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "http-server.cmd" : "http-server"
  );

  console.log(`Serving UI on http://localhost:${port}/pages/index.html`);
  const child = spawn(bin, ["ui", "-p", String(port)], {
    cwd: rootDir,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main();
