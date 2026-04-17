import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { cac } from "cac";
import open from "open";
import getPort, { portNumbers } from "get-port";

import { startServer } from "./index.js";
import {
  setClaudeConfigDirOverride,
  getClaudeConfigDir,
  getProjectsDir,
} from "./config.js";

const [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  console.error(
    `cc-dashboard requires Node.js >= 18 (current: ${process.versions.node})`,
  );
  process.exit(1);
}

const requireFromHere = createRequire(import.meta.url);
let PACKAGE_VERSION = "0.0.0";
try {
  PACKAGE_VERSION =
    (requireFromHere("../../package.json") as { version?: string }).version ??
    "0.0.0";
} catch {
  /* noop */
}

interface RunOptions {
  port?: string | number;
  host: string;
  projectsDir?: string;
  open?: boolean;
}

async function run(opts: RunOptions): Promise<void> {
  if (opts.projectsDir) {
    const resolved = path.resolve(opts.projectsDir);
    if (!fs.existsSync(resolved)) {
      console.error(
        `cc-dashboard: --projects-dir path does not exist: ${resolved}`,
      );
      process.exit(1);
    }
    setClaudeConfigDirOverride(resolved);
  }

  const projectsDir = getProjectsDir();
  if (!fs.existsSync(projectsDir)) {
    console.warn(
      `⚠  ${projectsDir} not found. Have you run Claude Code yet? The dashboard will render empty.`,
    );
  }

  const desired = opts.port ? Number(opts.port) : 3939;
  if (Number.isNaN(desired) || desired <= 0 || desired > 65535) {
    console.error(`cc-dashboard: invalid --port value: ${opts.port}`);
    process.exit(1);
  }

  const port = await getPort({
    port: [desired, ...portNumbers(desired + 1, desired + 20)],
  });
  if (opts.port && port !== desired) {
    console.warn(
      `Port ${desired} is in use — falling back to ${port}. Pass --port to pin a specific port.`,
    );
  }

  if (opts.host === "0.0.0.0") {
    console.warn(
      "⚠  Binding to 0.0.0.0 exposes the dashboard to your local network.",
    );
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const staticDir = path.resolve(here, "../public");
  if (!fs.existsSync(path.join(staticDir, "index.html"))) {
    console.error(
      `cc-dashboard: static assets missing at ${staticDir}. The package may be corrupt — try reinstalling.`,
    );
    process.exit(1);
  }

  let started;
  try {
    started = await startServer({
      port,
      host: opts.host,
      staticDir,
      devCors: false,
    });
  } catch (err) {
    console.error("cc-dashboard: failed to start server:", err);
    process.exit(1);
  }

  const { url, close } = started;
  console.log(`Claude Code Session Dashboard started at ${url}`);
  console.log(`Reading sessions from ${getClaudeConfigDir()}`);

  if (opts.open !== false) {
    try {
      await open(url);
    } catch {
      console.log(`Open ${url} in your browser.`);
    }
  }

  const shutdown = async () => {
    try {
      await close();
    } catch {
      /* noop */
    }
    process.exit(0);
  };
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, shutdown);
  }
}

const cli = cac("cc-dashboard");
cli
  .command("[]", "Start the Claude Code Session Dashboard")
  .option("--port <port>", "Port to bind (default: 3939, auto-fallback if busy)")
  .option("--host <host>", "Host to bind", { default: "127.0.0.1" })
  .option("--projects-dir <path>", "Override Claude config directory")
  .option("--no-open", "Do not open the browser automatically")
  .action(async (opts: RunOptions) => {
    await run(opts);
  });
cli.help();
cli.version(PACKAGE_VERSION);
cli.parse();

export {};
