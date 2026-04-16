import { Router } from "express";

import { readStatsCache } from "../parsers/index-reader.js";
import { getAllProjects, getAllSessions } from "../services/session-service.js";

const router = Router();

router.get("/api/overview", async (_req, res) => {
  try {
    const [statsCache, projects, sessionsResult] = await Promise.all([
      readStatsCache(),
      getAllProjects(),
      getAllSessions({ limit: 10, sort: "modified", order: "desc" }),
    ]);

    res.json({
      statsCache,
      totalProjects: projects.length,
      recentSessions: sessionsResult.sessions,
      totalSessions: sessionsResult.total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
