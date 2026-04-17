import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import type { Server } from "node:http";

import { PORT, HOST } from "./config.js";
import overviewRouter from "./routes/overview.js";
import sessionsRouter from "./routes/sessions.js";

export interface StartServerOptions {
  port: number;
  host: string;
  staticDir?: string;
  devCors?: boolean;
}

export interface StartedServer {
  url: string;
  close: () => Promise<void>;
}

const DEV_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

export async function startServer(
  opts: StartServerOptions,
): Promise<StartedServer> {
  const app = express();

  app.use(express.json());
  if (opts.devCors) {
    app.use(cors({ origin: DEV_CORS_ORIGINS }));
  }

  app.use(overviewRouter);
  app.use(sessionsRouter);

  if (opts.staticDir) {
    const staticDir = opts.staticDir;
    app.use(express.static(staticDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    },
  );

  return new Promise<StartedServer>((resolve, reject) => {
    let server: Server;
    const onError = (err: NodeJS.ErrnoException) => {
      reject(err);
    };
    server = app.listen(opts.port, opts.host, () => {
      server.off("error", onError);
      resolve({
        url: `http://${opts.host}:${opts.port}`,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((e) => (e ? rej(e) : res()));
          }),
      });
    });
    server.once("error", onError);
  });
}

function resolveStaticDirForDevBuild(): string | undefined {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../public"),
    path.resolve(here, "../../client/dist"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      return dir;
    }
  }
  return undefined;
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  const staticDir = resolveStaticDirForDevBuild();
  startServer({
    port: PORT,
    host: HOST,
    staticDir,
    devCors: process.env.NODE_ENV !== "production",
  })
    .then((s) => {
      console.log(`Server listening on ${s.url}`);
    })
    .catch((err) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}
