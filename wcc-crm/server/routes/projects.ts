import { Router } from "express";
import { db } from "../db.js";
import { projects, users } from "../../shared/schema.js";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/projects
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, phase, search } = req.query;

    let query = db
      .select({
        id: projects.id,
        name: projects.name,
        address: projects.address,
        clientName: projects.clientName,
        currentPhase: projects.currentPhase,
        status: projects.status,
        contractValue: projects.contractValue,
        startDate: projects.startDate,
        estimatedCompletion: projects.estimatedCompletion,
        projectManagerId: projects.projectManagerId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .$dynamic();

    const conditions = [];
    if (status && typeof status === "string") {
      conditions.push(eq(projects.status, status));
    }
    if (phase && typeof phase === "string") {
      conditions.push(eq(projects.currentPhase, phase));
    }
    if (search && typeof search === "string") {
      conditions.push(
        or(
          ilike(projects.name, `%${search}%`),
          ilike(projects.address, `%${search}%`),
          ilike(projects.clientName, `%${search}%`)
        )!
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query.orderBy(desc(projects.updatedAt));
    res.json(result);
  } catch (err) {
    console.error("[projects] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/projects
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, address, clientName, clientEmail, clientPhone, projectManagerId, currentPhase, contractValue, startDate, estimatedCompletion, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const [project] = await db
      .insert(projects)
      .values({
        name,
        address,
        clientName,
        clientEmail,
        clientPhone,
        projectManagerId,
        currentPhase: currentPhase || "bid_invite",
        contractValue,
        startDate,
        estimatedCompletion,
        tags: tags || [],
      })
      .returning();

    res.status(201).json(project);
  } catch (err) {
    console.error("[projects] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/v1/projects/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const projectId = req.params.id as string;
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Get PM info if assigned
    let pm = null;
    if (project.projectManagerId) {
      const [pmUser] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, project.projectManagerId))
        .limit(1);
      pm = pmUser || null;
    }

    res.json({ ...project, projectManager: pm });
  } catch (err) {
    console.error("[projects] get error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/projects/:id
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {};
    const allowed = [
      "name", "address", "clientName", "clientEmail", "clientPhone",
      "projectManagerId", "currentPhase", "status", "contractValue",
      "startDate", "estimatedCompletion", "actualCompletion", "tags", "metadata",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    updates.updatedAt = new Date();

    const projectId = req.params.id as string;
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, projectId))
      .returning();

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    console.error("[projects] update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/v1/projects/:id (soft delete via status)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const projectId = req.params.id as string;
    const [project] = await db
      .update(projects)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[projects] delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
