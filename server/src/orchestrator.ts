import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { runAgent } from "./agents";
import { recallProjectMemory } from "./memory";
import type { Activity, AgentName, Project } from "./types";

const STORE_FILE = join(import.meta.dir, "..", "data", "projects.json");
const projects = new Map<string, Project>();

const activitySchema = z.object({ id: z.string(), at: z.string(), agent: z.enum(["Research", "Planning", "Marketing", "Orchestrator"]), message: z.string(), kind: z.enum(["started", "stored", "recalled", "completed", "error"]) });
const projectSchema = z.object({ id: z.string(), request: z.string(), status: z.enum(["draft", "running", "completed", "failed"]), createdAt: z.string(), outputs: z.object({ Research: z.string().optional(), Planning: z.string().optional(), Marketing: z.string().optional() }).default({}), activities: z.array(activitySchema).default([]) });

async function loadProjects() {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = projectSchema.array().parse(JSON.parse(raw) as unknown);
    for (const project of parsed) projects.set(project.id, project);
    if (projects.size) console.log(`[projects] restored ${projects.size} persisted project(s) from ${STORE_FILE}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!message.includes("ENOENT")) console.error(`[projects] could not restore persisted projects: ${message}`);
  }
}

let persistChain: Promise<void> = Promise.resolve();
function persistProjects() {
  persistChain = persistChain
    .then(async () => {
      await mkdir(dirname(STORE_FILE), { recursive: true });
      const tempFile = `${STORE_FILE}.tmp`;
      await writeFile(tempFile, JSON.stringify([...projects.values()]));
      await rename(tempFile, STORE_FILE);
    })
    .catch((error) => console.error(`[projects] could not persist project store: ${error instanceof Error ? error.message : "Unknown error"}`));
}

export function createProject(request: string) { const project: Project = { id: crypto.randomUUID(), request, status: "draft", createdAt: new Date().toISOString(), outputs: {}, activities: [] }; projects.set(project.id, project); addActivity(project, "Orchestrator", "Project created and ready for the agent team.", "started"); persistProjects(); return project; }
export function getProject(projectId: string) { return projects.get(projectId); }
export function getProjectActivities(projectId: string) { return projects.get(projectId)?.activities; }
export async function runProjectWorkflow(projectId: string) {
  const project = projects.get(projectId); if (!project) throw new Error("Project not found.");
  project.status = "running"; persistProjects();
  try {
    for (const agent of ["Research", "Planning", "Marketing"] as const) {
      addActivity(project, agent, agent === "Research" ? "Analyzing event requirements." : "Recalling relevant shared project memory.", agent === "Research" ? "started" : "recalled");
      const output = await runAgent(project, agent);
      project.outputs[agent] = output;
      addActivity(project, agent, "Stored its output in shared project memory.", "stored");
      addActivity(project, agent, "Completed its specialist deliverable.", "completed");
      persistProjects();
    }
    project.status = "completed";
    addActivity(project, "Orchestrator", "Published the completed event project.", "completed");
    persistProjects();
    const memory = await recallProjectMemory(project.id, project.request);
    return { project, memoryCount: memory.total };
  } catch (error) {
    project.status = "failed";
    addActivity(project, "Orchestrator", "Workflow stopped because a required service failed.", "error");
    persistProjects();
    throw error;
  }
}
function addActivity(project: Project, agent: AgentName, message: string, kind: Activity["kind"]) { project.activities.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), agent, message, kind }); }

await loadProjects();