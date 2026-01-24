const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const port = 8080;

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

async function main() {
  const free = await isPortFree(port);
  if (!free) {
    console.error(`Port ${port} is already in use. Stop the other service first.`);
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
