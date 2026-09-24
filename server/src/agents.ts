import { config } from "./config";
import { recallProjectMemory, rememberProjectMemory } from "./memory";
import { getCalendarFacts } from "./events";
import type { AgentName, Project } from "./types";

const instructions: Record<Exclude<AgentName, "Orchestrator">, string> = {
  Research: "You are EventPilot's Research Agent. Extract only durable, useful facts, constraints, audience details, and success criteria from the event brief. Return concise bullet points, not a general essay.",
  Planning: "You are EventPilot's Planning Agent. Create a practical event plan using only the recalled shared memory. Cover format, venue/logistics, budget allocation, timeline, speakers, and ticketing. State assumptions.",
  Marketing: "You are EventPilot's Marketing Agent. Create a focused marketing strategy using the recalled shared memory. Cover positioning, channels, campaign timeline, partnerships, and measurable acquisition targets.",
};
function researchInstruction() {
  const { facts, meta } = getCalendarFacts();
  return `${instructions.Research} The current year is 2026 (today is ${new Date().toISOString().slice(0, 10)}); do not date events from past editions in your training data. The user-provided event calendar includes: DevFest 2026 is happening in November; a Sui event is happening in November; Moonshot My Tech Cabal is happening in November; Gitex is happening in September; Comic Con is happening in September; CES is happening in January; Google I/O is happening in May; KubeCon + CloudNativeCon is happening in October; Grace Hopper Celebration is happening in October; Web Summit is happening in November; AWS re:Invent is happening in December. The auto-updated Nigeria event calendar (feed ${meta.source}${meta.updatedAt ? `, last refreshed ${meta.updatedAt}` : ""}) includes: ${facts}. Treat all of these as reference facts for 2026, preserve the event names, months, and years, and identify them as user-provided rather than independently verified.`;
}
const MAX_RETRIES = 4;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_HINTS = /credits|rate|temporarily|timeout|overloaded|unavailable|try again/i;

function isRetryable(status: number, message: string) {
  return RETRYABLE_STATUSES.has(status) || RETRYABLE_HINTS.test(message);
}
function backoff(attempt: number) {
  return Math.min(500 * 2 ** attempt, 8000) + Math.random() * 250;
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generate(systemInstruction: string, input: string) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.OPENROUTER_API_KEY}`, "HTTP-Referer": "http://localhost:3000", "X-Title": "EventPilot" },
        body: JSON.stringify({ model: config.OPENROUTER_MODEL, messages: [{ role: "system", content: systemInstruction }, { role: "user", content: input }] }),
      });
    } catch (error) {
      if (attempt < MAX_RETRIES) { await delay(backoff(attempt)); continue; }
      throw new Error(`OpenRouter (${config.OPENROUTER_MODEL}) could not be reached: ${error instanceof Error ? error.message : "Unknown connection error"}`);
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (response.ok) {
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      throw new Error("OpenRouter returned an empty response.");
    }
    const message = payload.error?.message || `OpenRouter request failed with status ${response.status}.`;
    if (attempt < MAX_RETRIES && isRetryable(response.status, message)) { await delay(backoff(attempt)); continue; }
    throw new Error(message);
  }
  throw new Error("OpenRouter request failed after exhausting all retries.");
}
export async function runAgent(project: Project, agent: Exclude<AgentName, "Orchestrator">) {
  if (agent === "Research") { const output = await generate(researchInstruction(), `Event brief:\n${project.request}`); await rememberProjectMemory(project.id, agent, output); return output; }
  const recalled = await recallProjectMemory(project.id, project.request);
  const context = recalled.memories.map((memory) => memory.content).join("\n\n");
  if (!context) throw new Error("No shared project memories were available for this agent.");
  const output = await generate(instructions[agent], `Event brief:\n${project.request}\n\nRecalled shared memory:\n${context}`);
  await rememberProjectMemory(project.id, agent, output); return output;
}
export async function answerProjectQuestion(project: Project, question: string) {
  const recalled = await recallProjectMemory(project.id, question); const context = recalled.memories.map((memory) => memory.content).join("\n\n");
  const { facts, meta } = getCalendarFacts();
  const answer = await generate(
    "You are EventPilot's project assistant. The current year is 2026 (today is " + new Date().toISOString().slice(0, 10) + "). You are given an auto-updated Nigeria event calendar that is authoritative for upcoming event dates; do not invent or date events from training data. Answer using both the calendar and the supplied shared-memory excerpts. When they conflict, trust the calendar. Be concise and cite the originating agent when apparent.",
    `Question: ${question}\n\nAuto-updated Nigeria event calendar (feed ${meta.source}${meta.updatedAt ? `, last refreshed ${meta.updatedAt}` : ""}):\n${facts}\n\nShared-memory excerpts:\n${context || "No relevant project memories found."}`
  );
  return { answer, memoriesUsed: recalled.memories.map((memory) => memory.id) };
}
