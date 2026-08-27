"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { eventPilotApi, type Project } from "@/lib/api";

export default function AgentRunsPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [message, setMessage] = useState("Loading active workflow...");
  useEffect(() => { const id = window.sessionStorage.getItem("eventpilot-active-project-id"); if (!id) { setMessage("Run a workflow on the dashboard to see agent activity."); return; } eventPilotApi.getProject(id).then((result) => { setProject(result); setMessage(""); }).catch(() => { window.sessionStorage.removeItem("eventpilot-active-project-id"); setMessage("The backend no longer has this project. Run a new workflow."); }); }, []);
  return <main className="subpage"><Link href="/dashboard" className="subpage-back">Back to dashboard</Link><nav className="subpage-nav"><Link href="/dashboard/memory">Memory vault</Link><Link href="/dashboard/runs" className="active">Agent runs</Link><Link href="/dashboard/chat">Project chat</Link></nav><span className="small-label">Orchestrator</span><h1>Agent runs</h1><p className="subpage-lede">Live activity from the active backend project.</p><section className="live-list">{project ? project.activities.map((activity) => <article key={activity.id} className="live-list-item"><time>{new Date(activity.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><div><small>{activity.agent} / {activity.kind}</small><p>{activity.message}</p></div></article>) : <p className="empty-copy">{message}</p>}</section></main>;
}
