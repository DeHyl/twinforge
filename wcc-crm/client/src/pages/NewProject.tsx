import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { ArrowLeft } from "lucide-react";

const PHASES = [
  { value: "bid_invite", label: "Bid Invite / Lead" },
  { value: "bid_proposal", label: "Bid / Proposal" },
  { value: "po_contract", label: "PO / Contract" },
  { value: "pre_construction", label: "Pre-Construction" },
  { value: "execution", label: "Execution" },
  { value: "closeout", label: "Closeout" },
  { value: "invoicing", label: "Invoicing & Payment" },
];

export default function NewProject() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    address: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    projectManagerId: "",
    currentPhase: "bid_invite",
    contractValue: "",
    startDate: "",
    estimatedCompletion: "",
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: api.listUsers,
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createProject(data),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${project.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = { ...form };
    if (!form.projectManagerId) delete data.projectManagerId;
    if (!form.contractValue) delete data.contractValue;
    if (!form.startDate) delete data.startDate;
    if (!form.estimatedCompletion) delete data.estimatedCompletion;
    createMutation.mutate(data);
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/")} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">New Project</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {createMutation.error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {createMutation.error.message}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Project Name *</label>
              <input type="text" value={form.name} onChange={set("name")} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
                placeholder="e.g. 123 Main St Abatement" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <input type="text" value={form.address} onChange={set("address")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
                placeholder="123 Main St, City, State" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Client Name</label>
              <input type="text" value={form.clientName} onChange={set("clientName")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Client Email</label>
              <input type="email" value={form.clientEmail} onChange={set("clientEmail")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Client Phone</label>
              <input type="tel" value={form.clientPhone} onChange={set("clientPhone")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Project Manager</label>
              <select value={form.projectManagerId} onChange={set("projectManagerId")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none">
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Starting Phase</label>
              <select value={form.currentPhase} onChange={set("currentPhase")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none">
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Contract Value</label>
              <input type="number" step="0.01" value={form.contractValue} onChange={set("contractValue")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500"
                placeholder="0.00" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
              <input type="date" value={form.startDate} onChange={set("startDate")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estimated Completion</label>
              <input type="date" value={form.estimatedCompletion} onChange={set("estimatedCompletion")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-wcc-500 focus:outline-none focus:ring-1 focus:ring-wcc-500" />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => navigate("/")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="rounded-lg bg-wcc-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-wcc-600 disabled:opacity-50">
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
