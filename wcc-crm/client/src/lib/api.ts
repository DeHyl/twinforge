const BASE = "/api/v1";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Auth
export const api = {
  login: (email: string, password: string) =>
    request<{ id: string; name: string; email: string; role: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () =>
    request<{ id: string; name: string; email: string; role: string; phone: string | null }>("/auth/me"),

  // Projects
  listProjects: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<any[]>(`/projects${qs}`);
  },
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: Record<string, unknown>) =>
    request<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: Record<string, unknown>) =>
    request<any>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),

  // Timeline
  getTimeline: (projectId: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<any[]>(`/projects/${projectId}/timeline${qs}`);
  },
  addTimelineEvent: (projectId: string, data: Record<string, unknown>) =>
    request<any>(`/projects/${projectId}/timeline`, { method: "POST", body: JSON.stringify(data) }),

  // Contacts
  getContacts: (projectId: string) => request<any[]>(`/projects/${projectId}/contacts`),
  addContact: (projectId: string, data: Record<string, unknown>) =>
    request<any>(`/projects/${projectId}/contacts`, { method: "POST", body: JSON.stringify(data) }),

  // Documents
  getDocuments: (projectId: string) => request<any[]>(`/projects/${projectId}/documents`),
  addDocument: (projectId: string, data: Record<string, unknown>) =>
    request<any>(`/projects/${projectId}/documents`, { method: "POST", body: JSON.stringify(data) }),

  // Users
  listUsers: () => request<any[]>("/users"),
  createUser: (data: Record<string, unknown>) =>
    request<any>("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    request<any>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};
