import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/projects/:projectId/documents
router.get("/:projectId/documents", requireAuth, async (req, res) => {
  try {
    const projectId = req.params.projectId as string;
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(documents.createdAt);

    res.json(docs);
  } catch (err) {
    console.error("[documents] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/projects/:projectId/documents
router.post("/:projectId/documents", requireAuth, async (req, res) => {
  try {
    const { name, docType, source, externalUrl, phase } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Document name is required" });
    }

    const projectId = req.params.projectId as string;
    const [doc] = await db
      .insert(documents)
      .values({
        projectId,
        name,
        docType: docType || "other",
        source: source || "upload",
        externalUrl,
        phase,
        uploadedBy: req.session.userId,
      })
      .returning();

    res.status(201).json(doc);
  } catch (err) {
    console.error("[documents] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
