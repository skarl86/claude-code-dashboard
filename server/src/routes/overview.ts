import { Router } from "express";

import { getAllProjects, getAllSessions, computeOverviewStats } from "../services/session-service.js";

const router = Router();

router.get("/api/overview", async (_req, res) => {
  try {
    const [stats, projects, sessionsResult] = await Promise.all([
      computeOverviewStats(),
      getAllProjects(),
      getAllSessions({ limit: 10, sort: "modified", order: "desc" }),
    ]);

    res.json({
      stats,
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
