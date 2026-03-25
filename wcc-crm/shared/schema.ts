import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  jsonb,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Enums (as const arrays for reuse) ──────────────────────────────────────

export const PROJECT_PHASES = [
  "bid_invite",
  "bid_proposal",
  "po_contract",
  "pre_construction",
  "execution",
  "closeout",
  "invoicing",
] as const;

export const PROJECT_STATUSES = [
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const USER_ROLES = ["owner", "pm", "office", "field"] as const;

export const TIMELINE_SOURCES = [
  "gmail",
  "companycam",
  "dropbox",
  "google_sheets",
  "whatsapp",
  "buildertrend",
  "manual",
] as const;

export const EVENT_TYPES = [
  "email",
  "photo",
  "document",
  "message",
  "schedule",
  "financial",
  "note",
  "phase_change",
] as const;

export const DOC_TYPES = [
  "contract",
  "permit",
  "report",
  "manifest",
  "insurance",
  "lien_waiver",
  "estimate",
  "invoice",
  "other",
] as const;

export const PHASE_LABELS: Record<(typeof PROJECT_PHASES)[number], string> = {
  bid_invite: "Bid Invite / Lead",
  bid_proposal: "Bid / Proposal",
  po_contract: "PO / Contract",
  pre_construction: "Pre-Construction",
  execution: "Execution",
  closeout: "Closeout",
  invoicing: "Invoicing & Payment",
};

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("field"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  projectManagerId: varchar("project_manager_id").references(() => users.id),
  currentPhase: text("current_phase").notNull().default("bid_invite"),
  status: text("status").notNull().default("active"),
  contractValue: decimal("contract_value", { precision: 12, scale: 2 }),
  startDate: date("start_date"),
  estimatedCompletion: date("estimated_completion"),
  actualCompletion: date("actual_completion"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

// ─── Timeline Events ────────────────────────────────────────────────────────

export const timelineEvents = pgTable("timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id")
    .references(() => projects.id)
    .notNull(),
  source: text("source").notNull().default("manual"),
  eventType: text("event_type").notNull().default("note"),
  title: text("title").notNull(),
  summary: text("summary"),
  content: jsonb("content").$type<Record<string, unknown>>().default({}),
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  phase: text("phase"),
  author: text("author"),
  eventDate: timestamp("event_date").defaultNow().notNull(),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTimelineEventSchema = createInsertSchema(timelineEvents).omit({
  id: true,
  createdAt: true,
});
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type InsertTimelineEvent = z.infer<typeof insertTimelineEventSchema>;

// ─── Project Contacts ───────────────────────────────────────────────────────

export const projectContacts = pgTable("project_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  contactRole: text("contact_role").default("client"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectContactSchema = createInsertSchema(projectContacts).omit({
  id: true,
  createdAt: true,
});
export type ProjectContact = typeof projectContacts.$inferSelect;
export type InsertProjectContact = z.infer<typeof insertProjectContactSchema>;

// ─── Documents ──────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id")
    .references(() => projects.id)
    .notNull(),
  name: text("name").notNull(),
  docType: text("doc_type").notNull().default("other"),
  source: text("source").notNull().default("upload"),
  externalUrl: text("external_url"),
  externalId: text("external_id"),
  phase: text("phase"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// ─── Integration Configs ────────────────────────────────────────────────────

export const integrationConfigs = pgTable("integration_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull().unique(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: text("sync_status").default("idle"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IntegrationConfig = typeof integrationConfigs.$inferSelect;

// ─── Sync Logs ──────────────────────────────────────────────────────────────

export const syncLogs = pgTable("sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(),
  status: text("status").notNull().default("success"),
  recordsSynced: integer("records_synced").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type SyncLog = typeof syncLogs.$inferSelect;
