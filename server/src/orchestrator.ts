import { runAgent } from "./agents";
import { recallProjectMemory } from "./memory";
import type { Activity, AgentName, Project } from "./types";
const projects = new Map<string, Project>();
export function createProject(request: string) { const project: Project = { id: crypto.randomUUID(), request, status: "draft", createdAt: new Date().toISOString(), outputs: {}, activities: [] }; projects.set(project.id, project); addActivity(project, "Orchestrator", "Project created and ready for the agent team.", "started"); return project; }
export function getProject(projectId: string) { return projects.get(projectId); }
export function getProjectActivities(projectId: string) { return projects.get(projectId)?.activities; }
export async function runProjectWorkflow(projectId: string) {
  const project = projects.get(projectId); if (!project) throw new Error("Project not found."); project.status = "running";
  try { for (const agent of ["Research", "Planning", "Marketing"] as const) { addActivity(project, agent, agent === "Research" ? "Analyzing event requirements." : "Recalling relevant shared project memory.", agent === "Research" ? "started" : "recalled"); const output = await runAgent(project, agent); project.outputs[agent] = output; addActivity(project, agent, "Stored its output in shared project memory.", "stored"); addActivity(project, agent, "Completed its specialist deliverable.", "completed"); }
    project.status = "completed"; addActivity(project, "Orchestrator", "Published the completed event project.", "completed"); const memory = await recallProjectMemory(project.id, project.request); return { project, memoryCount: memory.total };
  } catch (error) { project.status = "failed"; addActivity(project, "Orchestrator", "Workflow stopped because a required service failed.", "error"); throw error; }
}
function addActivity(project: Project, agent: AgentName, message: string, kind: Activity["kind"]) { project.activities.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), agent, message, kind }); }
