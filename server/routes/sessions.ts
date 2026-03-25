import { Router } from "express";
import { db } from "../db.js";
import { sessions } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/v1/sessions — Start a new session
router.post("/", async (req, res) => {
  try {
    const { subject_name } = req.body ?? {};
    const [session] = await db
      .insert(sessions)
      .values({ subjectName: subject_name ?? null })
      .returning();
    res.status(201).json({
      id: session.id,
      url: `/s/${session.id}`,
    });
  } catch (err) {
    console.error("[sessions] create error:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// GET /api/v1/sessions/:id — Get session details
router.get("/:id", async (req, res) => {
  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, req.params.id),
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  } catch (err) {
    console.error("[sessions] get error:", err);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;
