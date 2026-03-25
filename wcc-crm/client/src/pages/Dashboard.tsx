import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import {
  Search,
  Plus,
  LogOut,
  HardHat,
  MapPin,
  User,
  ChevronRight,
  Filter,
} from "lucide-react";

const PHASE_LABELS: Record<string, string> = {
  bid_invite: "Bid Invite",
  bid_proposal: "Bid / Proposal",
  po_contract: "PO / Contract",
  pre_construction: "Pre-Con",
  execution: "Execution",
  closeout: "Closeout",
  invoicing: "Invoicing",
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

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [phaseFilter, setPhaseFilter] = useState<string>("");

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (phaseFilter) params.phase = phaseFilter;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", params],
    queryFn: () => api.listProjects(Object.keys(params).length ? params : undefined),
  });

  const activeCount = projects.filter((p: any) => p.status === "active").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-wcc-500">
              <HardHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">WCC Projects</h1>
              <p className="text-xs text-gray-500">{activeCount} active projects</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={() => logout()}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none"
            >
              <option value="">All Phases</option>
              {Object.entries(PHASE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate("/projects/new")}
            className="flex items-center gap-2 rounded-lg bg-wcc-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-wcc-600"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {/* Project Cards */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-wcc-500 border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center">
            <HardHat className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No projects found</p>
            <button
              onClick={() => navigate("/projects/new")}
              className="mt-3 text-sm font-medium text-wcc-500 hover:text-wcc-600"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-wcc-300 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 group-hover:text-wcc-600">
                    {project.name}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-wcc-400" />
                </div>

                {project.address && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {project.address}
                  </div>
                )}

                {project.clientName && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    {project.clientName}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_COLORS[project.currentPhase] || "bg-gray-100 text-gray-600"}`}>
                    {PHASE_LABELS[project.currentPhase] || project.currentPhase}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status] || "bg-gray-100 text-gray-600"}`}>
                    {project.status}
                  </span>
                </div>

                {project.contractValue && (
                  <p className="mt-3 text-sm font-medium text-gray-700">
                    ${Number(project.contractValue).toLocaleString()}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
