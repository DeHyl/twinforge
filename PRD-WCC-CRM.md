# WCC Project CRM — Product Requirements Document

## Overview

A unified project CRM for WCC (demolition & abatement) that aggregates data from 6 core tools — **Buildertrend, CompanyCam, Google Sheets, Gmail, Dropbox, and WhatsApp** — into a single timeline-driven view of every project from first lead to final closeout.

**Goal:** No one should ever have to ask "what's the status of this project?" or dig through 4 different apps to piece together the story.

---

## 1. Project Lifecycle (Demolition & Abatement)

Each project moves through these phases:

| Phase | Key Activities | Primary Data Sources |
|-------|---------------|---------------------|
| **1. Lead / Inquiry** | Initial contact, site info, scope | Gmail, WhatsApp, Google Sheets |
| **2. Site Assessment** | Survey, hazmat inspection, scope definition | CompanyCam, Dropbox, Buildertrend |
| **3. Bid / Proposal** | Estimate, proposal docs, negotiations | Google Sheets, Dropbox, Gmail |
| **4. Contract** | Signed contract, insurance certs, bonds | Dropbox, Gmail, Buildertrend |
| **5. Permitting & Regulatory** | EPA notifications, OSHA plans, city permits | Dropbox, Gmail |
| **6. Pre-Construction** | Air monitoring setup, containment plans, scheduling | Buildertrend, CompanyCam, Dropbox |
| **7. Active Work** | Daily logs, photos, waste manifests, change orders | CompanyCam, Buildertrend, WhatsApp |
| **8. Clearance & Testing** | Air clearance, final inspections, test results | Dropbox, CompanyCam, Gmail |
| **9. Closeout** | Final docs, lien waivers, warranty info, punch list | Dropbox, Buildertrend, Gmail |
| **10. Invoicing & Payment** | Invoices, payment tracking, retainage | Buildertrend, Google Sheets, Gmail |

---

## 2. Core Features

### 2.1 Project Dashboard
- **Card view** of all active projects with status chips (phase, health, last activity)
- **Filters:** by phase, client, project manager, date range, status (active/completed/on-hold)
- **Search:** across all project data (names, addresses, clients, notes)
- **Quick stats:** total active projects, projects by phase, revenue pipeline

### 2.2 Project Detail — Unified Timeline
The heart of the CRM. A single scrollable timeline per project that weaves together:

- **Emails** (Gmail) — sent/received related to this project
- **Photos** (CompanyCam) — tagged to this project
- **Documents** (Dropbox) — contracts, permits, reports, manifests
- **Messages** (WhatsApp) — relevant field comms
- **Schedule items** (Buildertrend) — milestones, tasks, daily logs
- **Financials** (Google Sheets / Buildertrend) — estimates, invoices, change orders
- **Internal notes** — manual entries by team members

Each timeline entry shows:
- Source icon (Gmail, CompanyCam, etc.)
- Timestamp
- Summary / preview
- Link to open in original source
- Phase tag (auto-assigned or manual)

### 2.3 Project Info Panel
Sidebar or top section with:
- Project name, address, client
- Current phase (with manual override)
- Project manager assignment
- Key dates (start, estimated completion, actual completion)
- Contract value, change orders, current total
- Regulatory status (permits filed, clearance received, etc.)
- Tags / labels

### 2.4 Integration Sync Engine
Background service that periodically pulls data from each source and matches it to projects:

| Source | Sync Method | Matching Strategy |
|--------|------------|-------------------|
| **Gmail** | Gmail API — poll or push via pub/sub | Match by client email, project name/address in subject/body |
| **CompanyCam** | CompanyCam API — project-based | Direct project mapping (CompanyCam projects → CRM projects) |
| **Dropbox** | Dropbox API — folder-based | Map Dropbox folder path → project |
| **Google Sheets** | Google Sheets API | Dedicated tracking sheet with project IDs |
| **WhatsApp** | WhatsApp Business API or export ingestion | Keyword/contact matching |
| **Buildertrend** | Buildertrend API (if available) or scrape/export | Direct project mapping |

### 2.5 Role-Based Views
| Role | What They See |
|------|--------------|
| **Owner / PM** | Everything — full dashboard, financials, all projects |
| **Office / Admin** | Project list, documents, scheduling, client comms |
| **Field Crew / Foreman** | Their assigned projects, photos, daily logs, WhatsApp thread |
| **Client** (future) | Read-only project status page with photos and milestones |

### 2.6 AI-Powered Features
Using Claude API (same pattern as TwinForge):
- **Project Summary Generator** — "Give me a 2-paragraph status update on this project"
- **Timeline Search** — natural language queries: "When did we get the clearance report for 123 Main St?"
- **Auto-categorization** — incoming emails/docs auto-tagged to correct project and phase
- **Weekly Digest** — auto-generated summary of all project activity for the week

---

## 3. Technical Architecture

### 3.1 Tech Stack (Matching TwinForge)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + TanStack Query
- **Backend:** Express + TypeScript + Drizzle ORM
- **Database:** PostgreSQL (Railway)
- **AI:** Anthropic Claude API
- **Deployment:** Railway (web service + PostgreSQL + cron worker)
- **Auth:** Session-based with role support (or Clerk/Lucia for speed)

### 3.2 Database Schema (Core Tables)

```
projects
├── id (uuid, PK)
├── name (text)
├── address (text)
├── client_name (text)
├── client_email (text)
├── client_phone (text)
├── project_manager_id (FK → users)
├── current_phase (enum: lead → closeout)
├── status (enum: active, on_hold, completed, cancelled)
├── contract_value (decimal)
├── start_date (date)
├── estimated_completion (date)
├── actual_completion (date)
├── tags (jsonb)
├── metadata (jsonb) — flexible fields
├── created_at / updated_at

users
├── id (uuid, PK)
├── name (text)
├── email (text)
├── role (enum: owner, pm, office, field)
├── phone (text)
├── created_at

timeline_events
├── id (uuid, PK)
├── project_id (FK → projects)
├── source (enum: gmail, companycam, dropbox, google_sheets, whatsapp, buildertrend, manual)
├── event_type (enum: email, photo, document, message, schedule, financial, note, phase_change)
├── title (text)
├── summary (text)
├── content (jsonb) — full payload from source
├── external_id (text) — ID in source system
├── external_url (text) — link to open in source
├── phase (enum) — which project phase this belongs to
├── author (text) — who created/sent it
├── event_date (timestamp) — when it happened in reality
├── synced_at (timestamp) — when we pulled it
├── created_at

integration_configs
├── id (uuid, PK)
├── source (enum)
├── config (jsonb) — API keys, folder paths, project mappings
├── last_sync_at (timestamp)
├── sync_status (text)
├── created_at

project_contacts
├── id (uuid, PK)
├── project_id (FK → projects)
├── name (text)
├── email (text)
├── phone (text)
├── role (text) — "client", "inspector", "sub", "consultant"
├── created_at

documents
├── id (uuid, PK)
├── project_id (FK → projects)
├── name (text)
├── doc_type (enum: contract, permit, report, manifest, insurance, lien_waiver, other)
├── source (enum: dropbox, upload, buildertrend)
├── external_url (text)
├── external_id (text)
├── phase (enum)
├── uploaded_by (FK → users)
├── created_at

sync_logs
├── id (uuid, PK)
├── source (enum)
├── status (enum: success, partial, failed)
├── records_synced (integer)
├── error_message (text)
├── started_at / completed_at
```

### 3.3 Integration Architecture

```
┌─────────────────────────────────────────────┐
│                 WCC CRM App                  │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │ React   │  │ Express  │  │ PostgreSQL│  │
│  │ Frontend│←→│ API      │←→│ Database  │  │
│  └─────────┘  └────┬─────┘  └───────────┘  │
│                     │                        │
│              ┌──────┴──────┐                 │
│              │ Sync Engine │                 │
│              └──────┬──────┘                 │
└─────────────────────┼───────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────┴───┐  ┌─────┴────┐  ┌────┴──────┐
   │ Gmail  │  │CompanyCam │  │ Dropbox   │
   │ API    │  │ API       │  │ API       │
   └────────┘  └──────────┘  └───────────┘
        │             │             │
   ┌────┴───┐  ┌─────┴────┐  ┌────┴──────┐
   │WhatsApp│  │Buildertrend│ │Google     │
   │Bus API │  │ API/Export │  │Sheets API│
   └────────┘  └──────────┘  └───────────┘
```

**Sync Strategy:**
- **Polling-based** for MVP: cron job runs every 15 minutes
- Each integration has an adapter class with `sync()` method
- Matching engine uses project name, address, client email, and folder mappings
- Unmatched items go to an "Inbox" for manual assignment

### 3.4 API Routes

```
Auth
  POST   /api/v1/auth/login
  POST   /api/v1/auth/logout
  GET    /api/v1/auth/me

Projects
  GET    /api/v1/projects              — list (with filters)
  POST   /api/v1/projects              — create
  GET    /api/v1/projects/:id          — detail
  PATCH  /api/v1/projects/:id          — update
  DELETE /api/v1/projects/:id          — archive

Timeline
  GET    /api/v1/projects/:id/timeline — all events (paginated, filterable by source/phase)
  POST   /api/v1/projects/:id/timeline — add manual note/event
  PATCH  /api/v1/timeline/:id          — edit event (re-tag phase, etc.)

Documents
  GET    /api/v1/projects/:id/documents
  POST   /api/v1/projects/:id/documents — manual upload or link

Contacts
  GET    /api/v1/projects/:id/contacts
  POST   /api/v1/projects/:id/contacts
  PATCH  /api/v1/contacts/:id

Integrations
  GET    /api/v1/integrations           — list configured integrations
  POST   /api/v1/integrations/:source/sync — trigger manual sync
  GET    /api/v1/integrations/inbox     — unmatched items
  POST   /api/v1/integrations/inbox/:id/assign — assign to project

AI
  POST   /api/v1/projects/:id/ai/summary    — generate project summary
  POST   /api/v1/ai/search                  — natural language search across projects
  GET    /api/v1/ai/weekly-digest            — generate weekly digest

Users
  GET    /api/v1/users
  POST   /api/v1/users
  PATCH  /api/v1/users/:id

Sync Logs
  GET    /api/v1/sync-logs
```

---

## 4. Pages / Screens

### P1 — Login
Simple email/password login. Role assigned by admin.

### P2 — Dashboard (Home)
- Project cards grid with phase indicators
- Quick filters bar
- Search bar
- "New Project" button
- Stats row: Active projects, This week's activity count, Pending inbox items

### P3 — Project Detail
- **Header:** Project name, address, phase badge, status, PM
- **Tab: Timeline** (default) — unified chronological feed with source filters
- **Tab: Documents** — organized by type (contracts, permits, manifests, reports)
- **Tab: Photos** — grid from CompanyCam
- **Tab: Contacts** — people involved in this project
- **Tab: Financials** — contract value, change orders, invoices, payments
- **Tab: Info** — editable project details, dates, regulatory checkboxes

### P4 — Integration Inbox
- List of unmatched items from sync
- Each item: source, preview, suggested project match, "Assign" button
- Bulk assign capability

### P5 — Settings / Integrations
- Configure API keys per integration
- Map Dropbox folders → projects
- Map CompanyCam projects → CRM projects
- Sync frequency and status
- User management (add/edit/remove, assign roles)

---

## 5. Build Phases

### Phase 1 — Foundation (Week 1-2)
- [ ] Project scaffolding (fork TwinForge structure)
- [ ] Database schema + migrations
- [ ] Auth system (simple session-based with roles)
- [ ] Projects CRUD API + UI
- [ ] Project detail page with manual timeline (notes)
- [ ] User management
- [ ] Deploy to Railway

### Phase 2 — Integrations (Week 3-4)
- [ ] Gmail integration (sync emails to timeline)
- [ ] CompanyCam integration (sync photos)
- [ ] Dropbox integration (sync documents by folder)
- [ ] Google Sheets integration (sync financial tracking)
- [ ] Integration inbox for unmatched items
- [ ] Auto-matching engine

### Phase 3 — Full Picture (Week 5-6)
- [ ] WhatsApp Business API integration
- [ ] Buildertrend integration
- [ ] AI project summaries
- [ ] AI-powered search
- [ ] Timeline filtering and phase auto-tagging
- [ ] Weekly digest generation

### Phase 4 — Polish (Week 7-8)
- [ ] Mobile-responsive refinement
- [ ] Role-based view restrictions
- [ ] Notification system (new activity on your projects)
- [ ] Export capabilities (PDF project reports)
- [ ] Client-facing read-only view (optional)
- [ ] Performance optimization

---

## 6. Integration Details

### Gmail
- **API:** Gmail API (REST) via Google OAuth2
- **What we sync:** Emails to/from project contacts, or matching project name/address in subject
- **Timeline entry:** Sender, subject, snippet, link to thread
- **Auth:** OAuth2 service account or user consent flow

### CompanyCam
- **API:** CompanyCam REST API v2
- **What we sync:** Photos tagged to projects (by CompanyCam project)
- **Timeline entry:** Photo thumbnail, caption, taken-by, GPS
- **Mapping:** CompanyCam project ID → CRM project ID

### Dropbox
- **API:** Dropbox API v2
- **What we sync:** Files in project-specific folders
- **Timeline entry:** File name, type, modified date, preview link
- **Mapping:** Folder path convention (e.g., `/WCC Projects/{ProjectName}/`)

### Google Sheets
- **API:** Google Sheets API v4
- **What we sync:** Rows from tracking spreadsheets (estimates, invoices, etc.)
- **Timeline entry:** Row data as structured financial event
- **Mapping:** Sheet column with project ID/name

### WhatsApp
- **API:** WhatsApp Business API (Cloud API via Meta)
- **What we sync:** Messages from project-related groups or contacts
- **Timeline entry:** Message text, sender, media attachments
- **Matching:** Contact phone → project contact, or group name → project

### Buildertrend
- **API:** Buildertrend API (if available) or structured CSV/export import
- **What we sync:** Schedule items, daily logs, change orders, to-dos
- **Timeline entry:** Activity type, description, assigned to, status
- **Mapping:** Buildertrend job ID → CRM project ID

---

## 7. Non-Functional Requirements

- **Performance:** Dashboard loads < 2s, timeline pagination (50 events per page)
- **Storage:** PostgreSQL for structured data, external services keep their own files (we store links, not files)
- **Security:** Role-based access, API keys encrypted at rest, HTTPS only
- **Reliability:** Sync failures logged and retried, never block the UI
- **Scale:** Support 100+ concurrent projects, 10k+ timeline events per project
