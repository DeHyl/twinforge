import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/v1/users
router.get("/", requireAuth, async (_req, res) => {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.name);

    res.json(result);
  } catch (err) {
    console.error("[users] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/v1/users (owner/pm only)
router.post("/", requireRole("owner", "pm"), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password required" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: role || "field",
        phone,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
      });

    res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("[users] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/v1/users/:id (owner/pm only)
router.patch("/:id", requireRole("owner", "pm"), async (req, res) => {
  try {
    const updates: Record<string, unknown> = {};
    const allowed = ["name", "email", "role", "phone"];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (req.body.password) {
      updates.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    if (updates.email) {
      updates.email = (updates.email as string).toLowerCase();
    }

    const userId = req.params.id as string;
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
      });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("[users] update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
