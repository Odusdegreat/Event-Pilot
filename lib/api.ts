const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Activity = { id: string; at: string; agent: string; message: string; kind: string };
export type Project = { id: string; request: string; status: "draft" | "running" | "completed" | "failed"; outputs: Partial<Record<"Research" | "Planning" | "Marketing", string>>; activities: Activity[] };
export type Memory = { id: string; content: string; distance: number };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.detail === "string" ? body.detail : body.error;
    throw new Error(message ?? "The EventPilot server could not complete that request.");
  }
  return body as T;
}

export const eventPilotApi = {
  createProject: (projectRequest: string) => request<Project>("/projects", { method: "POST", body: JSON.stringify({ request: projectRequest }) }),
  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),
  runProject: (projectId: string) => request<{ project: Project; memoryCount: number }>(`/projects/${projectId}/run`, { method: "POST" }),
  getMemories: (projectId: string, query?: string) => request<{ total: number; memories: Memory[] }>(`/projects/${projectId}/memories${query ? `?query=${encodeURIComponent(query)}` : ""}`),
  askProject: (projectId: string, question: string) => request<{ answer: string; memoriesUsed: string[] }>(`/projects/${projectId}/chat`, { method: "POST", body: JSON.stringify({ question }) }),
};
