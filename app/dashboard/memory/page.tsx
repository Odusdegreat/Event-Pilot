"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Database } from "lucide-react";
import { eventPilotApi, type Memory } from "@/lib/api";

export default function MemoryVaultPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [message, setMessage] = useState("Loading active project memory...");
  useEffect(() => { const id = window.sessionStorage.getItem("eventpilot-active-project-id"); if (!id) { setMessage("Run a workflow on the dashboard to create project memory."); return; } eventPilotApi.getMemories(id).then((result) => { setMemories(result.memories); setMessage(result.memories.length ? "" : "No indexed memory is available yet."); }).catch(() => { window.sessionStorage.removeItem("eventpilot-active-project-id"); setMessage("The backend no longer has this project. Run a new workflow."); }); }, []);
  return <main className="subpage"><Link href="/dashboard" className="subpage-back">Back to dashboard</Link><nav className="subpage-nav"><Link href="/dashboard/memory" className="active">Memory vault</Link><Link href="/dashboard/runs">Agent runs</Link><Link href="/dashboard/chat">Project chat</Link></nav><span className="small-label">Shared intelligence</span><h1>Memory vault</h1><p className="subpage-lede">Every entry below is recalled from the active project's MemWal namespace.</p><section className="live-list">{memories.length ? memories.map((memory) => <article key={memory.id} className="live-list-item"><Database size={16} /><div><small>{memory.content.match(/^\[([^\]]+)\]/)?.[1] ?? "Agent memory"}</small><p>{memory.content.replace(/^\[[^\]]+\]\s*/, "")}</p></div></article>) : <p className="empty-copy">{message}</p>}</section></main>;
}
