import { Router } from "express";
import { db } from "../db.js";
import { timelineEvents } from "../../shared/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/projects/:projectId/timeline
router.get("/:projectId/timeline", requireAuth, async (req, res) => {
  try {
    const { source, phase, limit = "50", offset = "0" } = req.query;

    const projectId = req.params.projectId as string;
    const conditions = [eq(timelineEvents.projectId, projectId)];

    if (source && typeof source === "string") {
      conditions.push(eq(timelineEvents.source, source));
    }
    if (phase && typeof phase === "string") {
      conditions.push(eq(timelineEvents.phase, phase));
    }

    const events = await db
      .select()
      .from(timelineEvents)
      .where(and(...conditions))
      .orderBy(desc(timelineEvents.eventDate))
      .limit(parseInt(limit as string, 10))
      .offset(parseInt(offset as string, 10));

    res.json(events);
  } catch (err) {
    console.error("[timeline] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/projects/:projectId/timeline
router.post("/:projectId/timeline", requireAuth, async (req, res) => {
  try {
    const { title, summary, phase, eventType, eventDate } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const projectId = req.params.projectId as string;
    const [event] = await db
      .insert(timelineEvents)
      .values({
        projectId,
        source: "manual",
        eventType: eventType || "note",
        title,
        summary,
        phase,
        author: req.session.userId,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
      })
      .returning();

    res.status(201).json(event);
  } catch (err) {
    console.error("[timeline] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/timeline/:id
router.patch("/timeline/:id", requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {};
    const allowed = ["title", "summary", "phase", "eventType"];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const eventId = req.params.id as string;
    const [event] = await db
      .update(timelineEvents)
      .set(updates)
      .where(eq(timelineEvents.id, eventId))
      .returning();

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  } catch (err) {
    console.error("[timeline] update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
