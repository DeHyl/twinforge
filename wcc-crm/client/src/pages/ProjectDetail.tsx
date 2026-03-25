import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { api } from "../lib/api";
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  Mail,
  Camera,
  FileText,
  MessageSquare,
  CalendarDays,
  PenLine,
  ChevronDown,
  Send,
  UserPlus,
  FilePlus,
} from "lucide-react";

const PHASE_LABELS: Record<string, string> = {
  bid_invite: "Bid Invite / Lead",
  bid_proposal: "Bid / Proposal",
  po_contract: "PO / Contract",
  pre_construction: "Pre-Construction",
  execution: "Execution",
  closeout: "Closeout",
  invoicing: "Invoicing & Payment",
};

const PHASE_COLORS: Record<string, string> = {
  bid_invite: "bg-blue-100 text-blue-700",
  bid_proposal: "bg-indigo-100 text-indigo-700",
  po_contract: "bg-purple-100 text-purple-700",
  pre_construction: "bg-amber-100 text-amber-700",
  execution: "bg-wcc-100 text-wcc-700",
  closeout: "bg-emerald-100 text-emerald-700",
  invoicing: "bg-green-100 text-green-700",
};

const SOURCE_ICONS: Record<string, typeof Mail> = {
  gmail: Mail,
  companycam: Camera,
  dropbox: FileText,
  whatsapp: MessageSquare,
  buildertrend: CalendarDays,
  google_sheets: FileText,
  manual: PenLine,
};

const SOURCE_COLORS: Record<string, string> = {
  gmail: "bg-red-100 text-red-600",
  companycam: "bg-green-100 text-green-600",
  dropbox: "bg-blue-100 text-blue-600",
  whatsapp: "bg-emerald-100 text-emerald-600",
  buildertrend: "bg-orange-100 text-orange-600",
  google_sheets: "bg-teal-100 text-teal-600",
  manual: "bg-gray-100 text-gray-600",
};

const PHASES = [
  { value: "bid_invite", label: "Bid Invite / Lead" },
  { value: "bid_proposal", label: "Bid / Proposal" },
  { value: "po_contract", label: "PO / Contract" },
  { value: "pre_construction", label: "Pre-Construction" },
  { value: "execution", label: "Execution" },
  { value: "closeout", label: "Closeout" },
  { value: "invoicing", label: "Invoicing & Payment" },
];

type Tab = "timeline" | "documents" | "contacts" | "info";

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSummary, setNoteSummary] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", contactRole: "client" });

  const projectId = params.id!;

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId),
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["timeline", projectId],
    queryFn: () => api.getTimeline(projectId),
    enabled: activeTab === "timeline",
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => api.getDocuments(projectId),
    enabled: activeTab === "documents",
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", projectId],
    queryFn: () => api.getContacts(projectId),
    enabled: activeTab === "contacts",
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addTimelineEvent(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timeline", projectId] });
      setShowNoteForm(false);
      setNoteTitle("");
      setNoteSummary("");
    },
  });

  const addContactMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addContact(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts", projectId] });
      setShowContactForm(false);
      setContactForm({ name: "", email: "", phone: "", contactRole: "client" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-wcc-500 border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-gray-500">Project not found</p>
        <button onClick={() => navigate("/")} className="text-sm text-wcc-500 hover:text-wcc-600">
          Back to dashboard
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "timeline", label: "Timeline", count: timeline.length },
    { key: "documents", label: "Documents", count: documents.length },
    { key: "contacts", label: "Contacts", count: contacts.length },
    { key: "info", label: "Info" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <button onClick={() => navigate("/")} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {project.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {project.address}
              </span>
            )}
            {project.clientName && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {project.clientName}
              </span>
            )}
            {project.contractValue && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> ${Number(project.contractValue).toLocaleString()}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PHASE_COLORS[project.currentPhase] || "bg-gray-100"}`}>
              {PHASE_LABELS[project.currentPhase] || project.currentPhase}
            </span>
          </div>

          {/* Phase stepper */}
          <div className="mt-4 flex gap-1">
            {PHASES.map((p, i) => {
              const phaseIdx = PHASES.findIndex((x) => x.value === project.currentPhase);
              const isActive = i === phaseIdx;
              const isPast = i < phaseIdx;
              return (
                <button
                  key={p.value}
                  onClick={() => updateProjectMutation.mutate({ currentPhase: p.value })}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    isActive ? "bg-wcc-500" : isPast ? "bg-wcc-300" : "bg-gray-200"
                  } hover:bg-wcc-400`}
                  title={p.label}
                />
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-6 border-t border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative py-3 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "text-wcc-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 text-xs text-gray-400">({tab.count})</span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-wcc-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* ─── Timeline Tab ─── */}
        {activeTab === "timeline" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Project Timeline</h2>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="flex items-center gap-1.5 rounded-lg bg-wcc-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-wcc-600"
              >
                <Plus className="h-3 w-3" /> Add Note
              </button>
            </div>

            {showNoteForm && (
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
                />
                <textarea
                  value={noteSummary}
                  onChange={(e) => setNoteSummary(e.target.value)}
                  placeholder="Details (optional)..."
                  rows={3}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowNoteForm(false)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => addNoteMutation.mutate({ title: noteTitle, summary: noteSummary, phase: project.currentPhase })}
                    disabled={!noteTitle || addNoteMutation.isPending}
                    className="flex items-center gap-1 rounded-lg bg-wcc-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-wcc-600 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" /> Save
                  </button>
                </div>
              </div>
            )}

            {timeline.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No timeline events yet</p>
                <p className="text-xs text-gray-400">Add a note or connect integrations to populate the timeline</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.map((event: any) => {
                  const Icon = SOURCE_ICONS[event.source] || PenLine;
                  const colorClass = SOURCE_COLORS[event.source] || "bg-gray-100 text-gray-600";
                  return (
                    <div key={event.id} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                          <span className="shrink-0 text-xs text-gray-400">
                            {new Date(event.eventDate).toLocaleDateString()}
                          </span>
                        </div>
                        {event.summary && (
                          <p className="mt-1 text-sm text-gray-500">{event.summary}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-400 capitalize">{event.source}</span>
                          {event.phase && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_COLORS[event.phase] || "bg-gray-100"}`}>
                              {PHASE_LABELS[event.phase] || event.phase}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Documents Tab ─── */}
        {activeTab === "documents" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Documents</h2>
              <button className="flex items-center gap-1.5 rounded-lg bg-wcc-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-wcc-600">
                <FilePlus className="h-3 w-3" /> Add Document
              </button>
            </div>
            {documents.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No documents yet</p>
                <p className="text-xs text-gray-400">Documents from Dropbox and Buildertrend will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-400">{doc.docType} &middot; {doc.source}</p>
                    </div>
                    {doc.externalUrl && (
                      <a href={doc.externalUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-wcc-500 hover:text-wcc-600">
                        Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Contacts Tab ─── */}
        {activeTab === "contacts" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Project Contacts</h2>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="flex items-center gap-1.5 rounded-lg bg-wcc-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-wcc-600"
              >
                <UserPlus className="h-3 w-3" /> Add Contact
              </button>
            </div>

            {showContactForm && (
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="text" value={contactForm.name}
                    onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Name *" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none" />
                  <input type="email" value={contactForm.email}
                    onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Email" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none" />
                  <input type="tel" value={contactForm.phone}
                    onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none" />
                  <select value={contactForm.contactRole}
                    onChange={(e) => setContactForm((f) => ({ ...f, contactRole: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none">
                    <option value="client">Client</option>
                    <option value="gc">General Contractor</option>
                    <option value="sub">Subcontractor</option>
                    <option value="inspector">Inspector</option>
                    <option value="consultant">Consultant</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setShowContactForm(false)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => addContactMutation.mutate(contactForm)}
                    disabled={!contactForm.name || addContactMutation.isPending}
                    className="rounded-lg bg-wcc-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-wcc-600 disabled:opacity-50"
                  >
                    Save Contact
                  </button>
                </div>
              </div>
            )}

            {contacts.length === 0 ? (
              <div className="py-16 text-center">
                <User className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm text-gray-500">No contacts added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.contactRole}
                        {c.email && ` · ${c.email}`}
                        {c.phone && ` · ${c.phone}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Info Tab ─── */}
        {activeTab === "info" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Project Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-gray-400">Name</dt>
                <dd className="text-sm text-gray-900">{project.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Address</dt>
                <dd className="text-sm text-gray-900">{project.address || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Client</dt>
                <dd className="text-sm text-gray-900">{project.clientName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Client Email</dt>
                <dd className="text-sm text-gray-900">{project.clientEmail || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Project Manager</dt>
                <dd className="text-sm text-gray-900">{project.projectManager?.name || "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Phase</dt>
                <dd>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PHASE_COLORS[project.currentPhase] || "bg-gray-100"}`}>
                    {PHASE_LABELS[project.currentPhase] || project.currentPhase}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Status</dt>
                <dd className="text-sm capitalize text-gray-900">{project.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Contract Value</dt>
                <dd className="text-sm text-gray-900">
                  {project.contractValue ? `$${Number(project.contractValue).toLocaleString()}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Start Date</dt>
                <dd className="text-sm text-gray-900">{project.startDate || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Est. Completion</dt>
                <dd className="text-sm text-gray-900">{project.estimatedCompletion || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-400">Created</dt>
                <dd className="text-sm text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
