import { MemWal } from "@mysten-incubation/memwal";
import { config } from "./config";
const memwal = MemWal.create({ key: config.MEMWAL_PRIVATE_KEY, accountId: config.MEMWAL_ACCOUNT_ID, serverUrl: config.MEMWAL_SERVER_URL, namespace: "eventpilot" });
const namespaceFor = (projectId: string) => `eventpilot:${projectId}`;
export async function getMemoryHealth() {
  const health = await memwal.health();
  try {
    await memwal.recall({ query: "EventPilot authentication check", limit: 1, namespace: "eventpilot:health", maxTokens: 32 });
    return { status: health.status, version: health.version, writeReady: health.write_ready ?? null, authenticated: true };
  } catch (error) {
    return { status: health.status, version: health.version, writeReady: health.write_ready ?? null, authenticated: false, authenticationError: describeMemoryError(error) };
  }
}
export async function rememberProjectMemory(projectId: string, agent: string, content: string) {
  try { const result = await memwal.rememberAndWait(`[${agent}] ${content}`, namespaceFor(projectId)); return { id: result.id, blobId: result.blob_id, namespace: result.namespace }; }
  catch (error) { throw new Error(`MemWal write failed for ${agent}: ${describeMemoryError(error)}`); }
}
export async function recallProjectMemory(projectId: string, query: string) {
  try { const result = await memwal.recall({ query, limit: 8, namespace: namespaceFor(projectId), maxTokens: 1_800 }); return { total: result.total, memories: result.results.map((memory) => ({ id: memory.blob_id, content: memory.text, distance: memory.distance })) }; }
  catch (error) { throw new Error(`MemWal recall failed: ${describeMemoryError(error)}`); }
}
function describeMemoryError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown memory error";
  if (message.includes("Walrus Memory isn't signed in")) return "the relayer rejected this backend's delegate key or account ID. Browser and MCP sign-ins are separate from this Bun server; register the configured delegate key on the configured MemWal account and network.";
  return message;
}
