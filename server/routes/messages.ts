import { Router } from "express";
import { db } from "../db.js";
import { messages, sessions } from "../../shared/schema.js";
import { eq, asc } from "drizzle-orm";
import { runInterviewer } from "../ai/interviewer.js";

const router = Router();

// POST /api/v1/sessions/:id/messages — Send a message and get AI reply
router.post("/:id/messages", async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { content, message_type, metadata } = req.body;

    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    // Get session
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const phase = session.currentPhase;

    // Store user message
    await db.insert(messages).values({
      sessionId,
      phase,
      role: "user",
      content,
      messageType: message_type ?? "text",
      metadata: metadata ?? {},
    });

    // Get conversation history for this phase
    const history = await db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      orderBy: [asc(messages.createdAt)],
    });

    // Filter to current phase for context (but include all for session 2+)
    const contextMessages = phase === 1
      ? history.filter((m) => m.phase === 1)
      : history;

    // Run interviewer (exclude the message we just stored — it's in content param)
    const pastMessages = contextMessages.slice(0, -1);
    const aiResponse = await runInterviewer(phase, pastMessages, content);

    // Store assistant message
    const assistantMetadata: Record<string, unknown> = {};
    if (aiResponse.buttons) {
      assistantMetadata.button_options = aiResponse.buttons;
    }

    await db.insert(messages).values({
      sessionId,
      phase,
      role: "assistant",
      content: aiResponse.content,
      messageType: "text",
      metadata: assistantMetadata,
    });

    // If session complete, update session state
    if (aiResponse.sessionComplete) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (phase === 1) {
        updates.session1Complete = true;
        updates.currentPhase = 2;
      } else if (phase === 2) {
        updates.session2Complete = true;
        updates.currentPhase = 3;
      } else if (phase === 3) {
        updates.session3Complete = true;
        updates.status = "completed";
      }
      await db.update(sessions).set(updates).where(eq(sessions.id, sessionId));
    }

    res.json({
      assistant_message: {
        content: aiResponse.content,
        message_type: "text",
        buttons: aiResponse.buttons,
      },
      session_complete: aiResponse.sessionComplete,
    });
  } catch (err) {
    console.error("[messages] error:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// GET /api/v1/sessions/:id/messages — Get all messages
router.get("/:id/messages", async (req, res) => {
  try {
    const allMessages = await db.query.messages.findMany({
      where: eq(messages.sessionId, req.params.id),
      orderBy: [asc(messages.createdAt)],
    });
    res.json(allMessages);
  } catch (err) {
    console.error("[messages] fetch error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
