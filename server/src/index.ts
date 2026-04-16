import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";

import { PORT, HOST } from "./config.js";
import overviewRouter from "./routes/overview.js";
import sessionsRouter from "./routes/sessions.js";

const app = express();

// ── Middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));

// ── API Routes ──────────────────────────────────────────────────────
app.use(overviewRouter);
app.use(sessionsRouter);

// ── Production: static files + SPA fallback ─────────────────────────
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(__dirname, "../../client/dist");

  app.use(express.static(clientDist));

  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ── Error handling ──────────────────────────────────────────────────
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

// ── Start ───────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
