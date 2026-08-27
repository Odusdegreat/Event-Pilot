import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { createProject, getProject, getProjectActivities, runProjectWorkflow } from "./src/orchestrator";
import { getMemoryHealth, recallProjectMemory } from "./src/memory";
import { answerProjectQuestion } from "./src/agents";
import { config } from "./src/config";

const app = new Hono();
const createProjectSchema = z.object({ request: z.string().min(20).max(4_000) });
const chatSchema = z.object({ question: z.string().min(3).max(2_000) });
app.use("/*", cors({ origin: config.CORS_ORIGIN, allowMethods: ["GET", "POST", "OPTIONS"] }));
app.use("/*", async (c, next) => {
  await next();
  if (c.res.status >= 400) console.error(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path} -> ${c.res.status}`);
});
app.onError((error, c) => {
  logFailure(c.req.method, c.req.path, error);
  return c.json({ error: "The EventPilot server encountered an unexpected error.", detail: safeMessage(error) }, 500);
});

app.get("/health", async (c) => {
  try { const memory = await getMemoryHealth(); return c.json({ status: memory.authenticated ? "ok" : "degraded", service: "eventpilot-server", memory }, memory.authenticated ? 200 : 503); }
  catch (error) { logFailure(c.req.method, c.req.path, error); return c.json({ status: "degraded", memory: "unavailable", error: safeMessage(error) }, 503); }
});
app.post("/projects", async (c) => {
  const body = createProjectSchema.safeParse(await c.req.json().catch(() => null));
  return body.success ? c.json(createProject(body.data.request), 201) : c.json({ error: "A project request of at least 20 characters is required." }, 400);
});
app.get("/projects/:projectId", (c) => { const project = getProject(c.req.param("projectId")); return project ? c.json(project) : c.json({ error: "Project not found." }, 404); });
app.post("/projects/:projectId/run", async (c) => {
  const project = getProject(c.req.param("projectId"));
  if (!project) return c.json({ error: "Project not found." }, 404);
  if (project.status === "running") return c.json({ error: "This workflow is already running." }, 409);
  try { return c.json(await runProjectWorkflow(project.id)); } catch (error) { logFailure(c.req.method, c.req.path, error, `workflow=${project.id}`); return c.json({ error: "The agent workflow could not finish.", detail: safeMessage(error) }, 502); }
});
app.get("/projects/:projectId/activity", (c) => { const activity = getProjectActivities(c.req.param("projectId")); return activity ? c.json({ activity }) : c.json({ error: "Project not found." }, 404); });
app.get("/projects/:projectId/memories", async (c) => {
  const project = getProject(c.req.param("projectId")); if (!project) return c.json({ error: "Project not found." }, 404);
  try { return c.json(await recallProjectMemory(project.id, c.req.query("query") ?? project.request)); } catch (error) { logFailure(c.req.method, c.req.path, error, `project=${project.id}`); return c.json({ error: "Memory service unavailable.", detail: safeMessage(error) }, 503); }
});
app.post("/projects/:projectId/chat", async (c) => {
  const project = getProject(c.req.param("projectId")); if (!project) return c.json({ error: "Project not found." }, 404);
  const body = chatSchema.safeParse(await c.req.json().catch(() => null)); if (!body.success) return c.json({ error: "A question is required." }, 400);
  try { return c.json(await answerProjectQuestion(project, body.data.question)); } catch (error) { logFailure(c.req.method, c.req.path, error, `project=${project.id}`); return c.json({ error: "The project assistant could not answer.", detail: safeMessage(error) }, 502); }
});
function safeMessage(error: unknown) { return error instanceof Error ? error.message.replace(/sk-[A-Za-z0-9_-]+|AIza[A-Za-z0-9_-]+/g, "[redacted]") : "Unknown service error"; }
function logFailure(method: string, path: string, error: unknown, context?: string) { console.error(`[${new Date().toISOString()}] ${method} ${path}${context ? ` (${context})` : ""}: ${safeMessage(error)}`); }
export default { port: config.PORT, idleTimeout: 120, fetch: app.fetch };
