import { Router } from "express";
import { db } from "../db.js";
import { soulPackages, sessions, messages, writingSamples } from "../../shared/schema.js";
import { eq, asc, desc } from "drizzle-orm";
import { generateSoulPackage } from "../ai/soulPackageGenerator.js";

const router = Router();

// POST /api/v1/sessions/:id/soul-package — Generate soul package
router.post("/:id/soul-package", async (req, res) => {
  try {
    const sessionId = req.params.id;

    // Get session
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Get all messages and writing samples
    const allMessages = await db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      orderBy: [asc(messages.createdAt)],
    });

    const allSamples = await db.query.writingSamples.findMany({
      where: eq(writingSamples.sessionId, sessionId),
    });

    // Generate
    const soulData = await generateSoulPackage(allMessages, allSamples);

    // Store
    const [pkg] = await db
      .insert(soulPackages)
      .values({
        sessionId,
        soulDocument: soulData.soulDocument,
        voiceProfile: soulData.voiceProfile,
        episodicMemories: soulData.episodicMemories,
        relationshipModes: soulData.relationshipModes,
        valuesMatrix: soulData.valuesMatrix,
        correctionLog: soulData.correctionLog,
        accuracyScore: soulData.accuracyScore,
      })
      .returning();

    // Mark session as generated
    await db
      .update(sessions)
      .set({ soulPackageGenerated: true, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    res.status(201).json(pkg);
  } catch (err) {
    console.error("[soul-package] generation error:", err);
    res.status(500).json({ error: "Failed to generate soul package" });
  }
});

// GET /api/v1/sessions/:id/soul-package — Get latest soul package
router.get("/:id/soul-package", async (req, res) => {
  try {
    const sessionId = req.params.id;

    const pkg = await db.query.soulPackages.findFirst({
      where: eq(soulPackages.sessionId, sessionId),
      orderBy: [desc(soulPackages.version)],
    });

    if (!pkg) {
      res.status(404).json({ error: "Soul package not found. Complete all sessions first." });
      return;
    }

    res.json(pkg);
  } catch (err) {
    console.error("[soul-package] fetch error:", err);
    res.status(500).json({ error: "Failed to fetch soul package" });
  }
});

export default router;
