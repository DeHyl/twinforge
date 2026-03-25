import "dotenv/config";
import express from "express";
import session from "express-session";
import path from "path";
import dns from "node:dns/promises";
import bcrypt from "bcryptjs";

const isDev = process.env.NODE_ENV !== "production";
const PORT = parseInt(process.env.PORT ?? "3002", 10);
const root = process.cwd();

async function resolveDbUrlToIPv4(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const url = new URL(process.env.DATABASE_URL);
    const [ipv4] = await dns.resolve4(url.hostname);
    url.hostname = ipv4;
    process.env.DATABASE_URL = url.toString();
    console.log("[wcc-crm] DB hostname resolved to IPv4:", ipv4);
  } catch (err) {
    console.warn("[wcc-crm] IPv4 resolution skipped:", err);
  }
}

async function main() {
  await resolveDbUrlToIPv4();

  // Bootstrap tables
  try {
    const { db } = await import("./db.js");
    const { sql } = await import("drizzle-orm");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'field',
        phone TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        address TEXT,
        client_name TEXT,
        client_email TEXT,
        client_phone TEXT,
        project_manager_id VARCHAR REFERENCES users(id),
        current_phase TEXT NOT NULL DEFAULT 'bid_invite',
        status TEXT NOT NULL DEFAULT 'active',
        contract_value DECIMAL(12,2),
        start_date DATE,
        estimated_completion DATE,
        actual_completion DATE,
        tags JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS timeline_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        source TEXT NOT NULL DEFAULT 'manual',
        event_type TEXT NOT NULL DEFAULT 'note',
        title TEXT NOT NULL,
        summary TEXT,
        content JSONB DEFAULT '{}',
        external_id TEXT,
        external_url TEXT,
        phase TEXT,
        author TEXT,
        event_date TIMESTAMP DEFAULT now() NOT NULL,
        synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_contacts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        contact_role TEXT DEFAULT 'client',
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        name TEXT NOT NULL,
        doc_type TEXT NOT NULL DEFAULT 'other',
        source TEXT NOT NULL DEFAULT 'upload',
        external_url TEXT,
        external_id TEXT,
        phase TEXT,
        uploaded_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_configs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        source TEXT NOT NULL UNIQUE,
        config JSONB DEFAULT '{}',
        last_sync_at TIMESTAMP,
        sync_status TEXT DEFAULT 'idle',
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        source TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'success',
        records_synced INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TIMESTAMP DEFAULT now() NOT NULL,
        completed_at TIMESTAMP
      )
    `);

    // Seed default admin user if none exists
    const { users: usersTable } = await import("../shared/schema.js");
    const { count } = await import("drizzle-orm");
    const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable);
    if (Number(userCount) === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await db.insert(usersTable).values({
        name: "Admin",
        email: "admin@wcc.com",
        passwordHash: hash,
        role: "owner",
      });
      console.log("[wcc-crm] Seeded default admin: admin@wcc.com / admin123");
    }

    console.log("[wcc-crm] Tables ready");
  } catch (err) {
    console.error("[wcc-crm] DB bootstrap error:", err);
  }

  const app = express();
  app.use(express.json({ limit: "5mb" }));

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "wcc-crm-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: !isDev,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "lax",
      },
    })
  );

  // ─── API Routes ────────────────────────────────────────────────────────
  const { default: authRouter } = await import("./routes/auth.js");
  const { default: projectsRouter } = await import("./routes/projects.js");
  const { default: timelineRouter } = await import("./routes/timeline.js");
  const { default: contactsRouter } = await import("./routes/contacts.js");
  const { default: documentsRouter } = await import("./routes/documents.js");
  const { default: usersRouter } = await import("./routes/users.js");

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/projects", projectsRouter);
  app.use("/api/v1/projects", timelineRouter);    // nested under projects/:id/timeline
  app.use("/api/v1/projects", contactsRouter);     // nested under projects/:id/contacts
  app.use("/api/v1/projects", documentsRouter);     // nested under projects/:id/documents
  app.use("/api/v1/users", usersRouter);

  // Also mount contacts PATCH at top level
  app.use("/api/v1/contacts", contactsRouter);

  // ─── Health check ──────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "wcc-crm", timestamp: new Date().toISOString() });
  });

  // ─── Static / SPA ──────────────────────────────────────────────────────
  if (isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: path.resolve(root, "client"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const publicDir = path.resolve(root, "dist/public");
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[wcc-crm] Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
