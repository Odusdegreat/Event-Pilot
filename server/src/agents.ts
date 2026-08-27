import { config } from "./config";
import { recallProjectMemory, rememberProjectMemory } from "./memory";
import type { AgentName, Project } from "./types";

const instructions: Record<Exclude<AgentName, "Orchestrator">, string> = {
  Research: "You are EventPilot's Research Agent. Extract only durable, useful facts, constraints, audience details, and success criteria from the event brief. Return concise bullet points, not a general essay. The user-provided event calendar includes: DevFest 2026 is happening in November; a Sui event is happening in November; Moonshot My Tech Cabal is happening in November; Gitex is happening in September; Comic Con is happening in September. Treat these as reference facts, preserve the event names and months, and identify them as user-provided rather than independently verified.",
  Planning: "You are EventPilot's Planning Agent. Create a practical event plan using only the recalled shared memory. Cover format, venue/logistics, budget allocation, timeline, speakers, and ticketing. State assumptions.",
  Marketing: "You are EventPilot's Marketing Agent. Create a focused marketing strategy using the recalled shared memory. Cover positioning, channels, campaign timeline, partnerships, and measurable acquisition targets.",
};
async function generate(systemInstruction: string, input: string) {
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.OPENROUTER_API_KEY}`, "HTTP-Referer": "http://localhost:3000", "X-Title": "EventPilot" },
      body: JSON.stringify({ model: config.OPENROUTER_MODEL, messages: [{ role: "system", content: systemInstruction }, { role: "user", content: input }] }),
    });
  } catch (error) {
    throw new Error(`OpenRouter (${config.OPENROUTER_MODEL}) could not be reached: ${error instanceof Error ? error.message : "Unknown connection error"}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || `OpenRouter request failed with status ${response.status}.`);
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned an empty response.");
  return text;
}
export async function runAgent(project: Project, agent: Exclude<AgentName, "Orchestrator">) {
  if (agent === "Research") { const output = await generate(instructions.Research, `Event brief:\n${project.request}`); await rememberProjectMemory(project.id, agent, output); return output; }
  const recalled = await recallProjectMemory(project.id, project.request);
  const context = recalled.memories.map((memory) => memory.content).join("\n\n");
  if (!context) throw new Error("No shared project memories were available for this agent.");
  const output = await generate(instructions[agent], `Event brief:\n${project.request}\n\nRecalled shared memory:\n${context}`);
  await rememberProjectMemory(project.id, agent, output); return output;
}
export async function answerProjectQuestion(project: Project, question: string) {
  const recalled = await recallProjectMemory(project.id, question); const context = recalled.memories.map((memory) => memory.content).join("\n\n");
  const answer = await generate("You are EventPilot's project assistant. Answer only from the supplied shared-memory excerpts. If memory is insufficient, say what is missing. Be concise and cite the originating agent when apparent.", `Question: ${question}\n\nShared-memory excerpts:\n${context || "No relevant project memories found."}`);
  return { answer, memoriesUsed: recalled.memories.map((memory) => memory.id) };
}
