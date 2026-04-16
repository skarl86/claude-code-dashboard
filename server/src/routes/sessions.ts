import { Router } from "express";
import type { Request, Response } from "express";

import {
  getAllSessions,
  getSessionDetail,
  getAllProjects,
} from "../services/session-service.js";

const router = Router();

// GET /api/sessions
router.get("/api/sessions", async (req: Request, res: Response) => {
  const project = req.query.project as string | undefined;
  const sort = req.query.sort as string | undefined;
  const order = req.query.order as "asc" | "desc" | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;

  const result = await getAllSessions({ project, sort, order, limit, offset });

  res.json({
    sessions: result.sessions,
    total: result.total,
    limit,
    offset,
  });
});

// GET /api/sessions/:sessionId
router.get("/api/sessions/:sessionId", async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const detail = await getSessionDetail(sessionId);

  if (!detail) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(detail);
});

// GET /api/projects
router.get("/api/projects", async (_req: Request, res: Response) => {
  const projects = await getAllProjects();
  res.json(projects);
});

export default router;
