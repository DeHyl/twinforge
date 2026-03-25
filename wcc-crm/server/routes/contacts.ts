import { Router } from "express";
import { db } from "../db.js";
import { projectContacts } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/projects/:projectId/contacts
router.get("/:projectId/contacts", requireAuth, async (req, res) => {
  try {
    const projectId = req.params.projectId as string;
    const contacts = await db
      .select()
      .from(projectContacts)
      .where(eq(projectContacts.projectId, projectId))
      .orderBy(projectContacts.name);

    res.json(contacts);
  } catch (err) {
    console.error("[contacts] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/projects/:projectId/contacts
router.post("/:projectId/contacts", requireAuth, async (req, res) => {
  try {
    const { name, email, phone, contactRole } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const projectId = req.params.projectId as string;
    const [contact] = await db
      .insert(projectContacts)
      .values({
        projectId,
        name,
        email,
        phone,
        contactRole: contactRole || "client",
      })
      .returning();

    res.status(201).json(contact);
  } catch (err) {
    console.error("[contacts] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/contacts/:id
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {};
    const allowed = ["name", "email", "phone", "contactRole"];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const contactId = req.params.id as string;
    const [contact] = await db
      .update(projectContacts)
      .set(updates)
      .where(eq(projectContacts.id, contactId))
      .returning();

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }
    res.json(contact);
  } catch (err) {
    console.error("[contacts] update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
