import "dotenv/config";
import express from "express";
import path from "path";
import dns from "node:dns/promises";

const isDev = process.env.NODE_ENV !== "production";
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const root = process.cwd();

async function resolveDbUrlToIPv4(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const url = new URL(process.env.DATABASE_URL);
    const [ipv4] = await dns.resolve4(url.hostname);
    url.hostname = ipv4;
    process.env.DATABASE_URL = url.toString();
    console.log("[twinforge] DB hostname resolved to IPv4:", ipv4);
  } catch (err) {
    console.warn("[twinforge] IPv4 resolution skipped:", err);
  }
}

async function main() {
  await resolveDbUrlToIPv4();

  // Ensure core tables exist
  try {
    const { db } = await import("./db.js");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_name TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        current_phase INTEGER NOT NULL DEFAULT 1,
        session_1_complete BOOLEAN NOT NULL DEFAULT false,
        session_2_complete BOOLEAN NOT NULL DEFAULT false,
        session_3_complete BOOLEAN NOT NULL DEFAULT false,
        uploads_complete BOOLEAN NOT NULL DEFAULT false,
        soul_package_generated BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL REFERENCES sessions(id),
        phase INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS writing_samples (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL REFERENCES sessions(id),
        content TEXT NOT NULL,
        context_tag TEXT NOT NULL DEFAULT 'other',
        source_type TEXT NOT NULL DEFAULT 'pasted_text',
        voice_analysis JSONB DEFAULT null,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS soul_packages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL REFERENCES sessions(id),
        version INTEGER NOT NULL DEFAULT 1,
        soul_document TEXT,
        voice_profile JSONB DEFAULT '{}',
        episodic_memories JSONB DEFAULT '[]',
        relationship_modes JSONB DEFAULT '{}',
        values_matrix JSONB DEFAULT '{}',
        correction_log JSONB DEFAULT '[]',
        accuracy_score DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS token_usage (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        operation TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd TEXT NOT NULL DEFAULT '0',
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log("[twinforge] Tables ready");
  } catch (err) {
    console.error("[twinforge] DB bootstrap error:", err);
  }

  const app = express();
  app.use(express.json({ limit: "5mb" }));

  // ─── API Routes ──────────────────────────────────────────────────────────
  const { default: sessionsRouter } = await import("./routes/sessions.js");
  const { default: messagesRouter } = await import("./routes/messages.js");
  const { default: samplesRouter } = await import("./routes/samples.js");
  const { default: soulPackageRouter } = await import("./routes/soul-package.js");

  app.use("/api/v1/sessions", sessionsRouter);
  app.use("/api/v1/sessions", messagesRouter);
  app.use("/api/v1/sessions", samplesRouter);
  app.use("/api/v1/sessions", soulPackageRouter);

  // ─── Health check ────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "twinforge", timestamp: new Date().toISOString() });
  });

  // ─── Static / SPA ────────────────────────────────────────────────────────
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
    console.log(`[twinforge] Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
