export type AgentName = "Research" | "Planning" | "Marketing" | "Orchestrator";
export type Activity = { id: string; at: string; agent: AgentName; message: string; kind: "started" | "stored" | "recalled" | "completed" | "error" };
export type Project = { id: string; request: string; status: "draft" | "running" | "completed" | "failed"; createdAt: string; outputs: Partial<Record<Exclude<AgentName, "Orchestrator">, string>>; activities: Activity[] };
