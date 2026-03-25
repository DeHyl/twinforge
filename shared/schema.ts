import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectName: text("subject_name"),
  status: text("status").notNull().default("active"),
  // "active" | "completed" | "abandoned"
  currentPhase: integer("current_phase").notNull().default(1),
  // 1 = reaction captures, 2 = story mining, 3 = mirror test
  session1Complete: boolean("session_1_complete").notNull().default(false),
  session2Complete: boolean("session_2_complete").notNull().default(false),
  session3Complete: boolean("session_3_complete").notNull().default(false),
  uploadsComplete: boolean("uploads_complete").notNull().default(false),
  soulPackageGenerated: boolean("soul_package_generated").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => sessions.id)
    .notNull(),
  phase: integer("phase").notNull(),
  role: text("role").notNull(), // "assistant" | "user"
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  // "text" | "button_response" | "voice_note" | "correction"
  metadata: jsonb("metadata")
    .$type<{
      extraction_tags?: string[];
      button_options?: string[];
      selected_option?: string;
      correction_of?: string;
      voice_url?: string;
      accuracy_vote?: "yes" | "no";
    }>()
    .default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// ─── Writing Samples ─────────────────────────────────────────────────────────

export const writingSamples = pgTable("writing_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => sessions.id)
    .notNull(),
  content: text("content").notNull(),
  contextTag: text("context_tag").notNull().default("other"),
  // "friend_text" | "work_email" | "social_post" | "draft" | "other"
  sourceType: text("source_type").notNull().default("pasted_text"),
  // "pasted_text" | "screenshot_ocr" | "file_upload"
  voiceAnalysis: jsonb("voice_analysis")
    .$type<{
      avg_sentence_length: number;
      vocabulary_level: "casual" | "moderate" | "formal";
      emoji_frequency: number;
      punctuation_style: string;
      opening_patterns: string[];
      closing_patterns: string[];
      tone_markers: string[];
    } | null>()
    .default(null),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWritingSampleSchema = createInsertSchema(writingSamples).omit({
  id: true,
  createdAt: true,
});
export type WritingSample = typeof writingSamples.$inferSelect;
export type InsertWritingSample = z.infer<typeof insertWritingSampleSchema>;

// ─── Soul Packages ───────────────────────────────────────────────────────────

export const soulPackages = pgTable("soul_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .references(() => sessions.id)
    .notNull(),
  version: integer("version").notNull().default(1),
  soulDocument: text("soul_document"), // Markdown, 3,000–6,000 words
  voiceProfile: jsonb("voice_profile").$type<Record<string, unknown>>().default({}),
  episodicMemories: jsonb("episodic_memories").$type<Record<string, unknown>[]>().default([]),
  relationshipModes: jsonb("relationship_modes").$type<Record<string, unknown>>().default({}),
  valuesMatrix: jsonb("values_matrix").$type<Record<string, unknown>>().default({}),
  correctionLog: jsonb("correction_log")
    .$type<
      Array<{
        twin_response: string;
        user_correction: string;
        scenario_context: string;
      }>
    >()
    .default([]),
  accuracyScore: doublePrecision("accuracy_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSoulPackageSchema = createInsertSchema(soulPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type SoulPackage = typeof soulPackages.$inferSelect;
export type InsertSoulPackage = z.infer<typeof insertSoulPackageSchema>;

// ─── Token Usage ─────────────────────────────────────────────────────────────

export const tokenUsage = pgTable("token_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operation: text("operation").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: text("cost_usd").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TokenUsage = typeof tokenUsage.$inferSelect;
