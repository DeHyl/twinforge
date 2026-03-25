import { Router } from "express";
import { db } from "../db.js";
import { writingSamples, sessions } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/v1/sessions/:id/samples — Upload a writing sample
router.post("/:id/samples", async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { content, context_tag, source_type } = req.body;

    if (!content || content.length < 10) {
      res.status(400).json({
        error: "Content must be at least 10 characters. Share a longer sample for better results.",
      });
      return;
    }

    // Verify session exists
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Basic voice analysis (synchronous, fast)
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    const words = content.split(/\s+/);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/gu) || []).length;
    const emojiFrequency = words.length > 0 ? emojiCount / words.length : 0;

    let vocabularyLevel: "casual" | "moderate" | "formal" = "moderate";
    const casualMarkers = (content.match(/\b(lol|haha|omg|tbh|idk|ngl|bruh|yo|gonna|wanna|gotta)\b/gi) || []).length;
    const formalMarkers = (content.match(/\b(furthermore|however|nevertheless|regarding|pursuant|accordingly)\b/gi) || []).length;
    if (casualMarkers > formalMarkers + 2) vocabularyLevel = "casual";
    else if (formalMarkers > casualMarkers + 2) vocabularyLevel = "formal";

    const voiceAnalysis = {
      avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
      vocabulary_level: vocabularyLevel,
      emoji_frequency: Math.round(emojiFrequency * 100) / 100,
      punctuation_style: content.includes("...") ? "ellipsis-heavy" : content.includes("—") ? "em-dash user" : "standard",
      opening_patterns: [] as string[],
      closing_patterns: [] as string[],
      tone_markers: [] as string[],
    };

    const [sample] = await db
      .insert(writingSamples)
      .values({
        sessionId,
        content,
        contextTag: context_tag ?? "other",
        sourceType: source_type ?? "pasted_text",
        voiceAnalysis,
      })
      .returning();

    res.status(201).json(sample);
  } catch (err) {
    console.error("[samples] error:", err);
    res.status(500).json({ error: "Failed to save writing sample" });
  }
});

// GET /api/v1/sessions/:id/samples — List writing samples
router.get("/:id/samples", async (req, res) => {
  try {
    const samples = await db.query.writingSamples.findMany({
      where: eq(writingSamples.sessionId, req.params.id),
    });
    res.json(samples);
  } catch (err) {
    console.error("[samples] fetch error:", err);
    res.status(500).json({ error: "Failed to fetch samples" });
  }
});

export default router;
