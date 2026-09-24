"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, LoaderCircle, PanelLeft, Share2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eventPilotApi, type Activity, type Memory, type Project } from "@/lib/api";

type Agent = "Research" | "Planning" | "Marketing";
const agents: Array<{ name: Agent; role: string; mark: string; color: string }> = [
  { name: "Research", role: "Signals and constraints", mark: "R", color: "coral" },
  { name: "Planning", role: "Experience and operations", mark: "P", color: "ink" },
  { name: "Marketing", role: "Audience and momentum", mark: "M", color: "teal" },
];
const defaultBrief = "Plan a developer conference in Lagos for 500 developers with a N10 million budget.";

export default function DashboardPage() {
  const [brief, setBrief] = useState(defaultBrief);
  const [project, setProject] = useState<Project | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedOutput, setSelectedOutput] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [closing, setClosing] = useState(false);
  const [opening, setOpening] = useState(false);
  const workflowInFlight = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 899px)");
    const onChange = () => {
      setIsMobile(query.matches);
      if (!query.matches) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      }
    };
    setIsMobile(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const projectId = window.sessionStorage.getItem("eventpilot-active-project-id");
    if (!projectId) return;
    Promise.all([eventPilotApi.getProject(projectId), eventPilotApi.getMemories(projectId)])
      .then(([activeProject, memory]) => {
        setProject(activeProject);
        setBrief(activeProject.request);
        setMemories(memory.memories);
        if (activeProject.status === "running") {
          workflowInFlight.current = true;
          setIsRunning(true);
          pollProject(projectId).finally(() => {
            workflowInFlight.current = false;
            setIsRunning(false);
          });
        }
      })
      .catch(() => window.sessionStorage.removeItem("eventpilot-active-project-id"));
  }, []);

  async function refreshProject(projectId: string) {
    const [activeProject, memory] = await Promise.all([eventPilotApi.getProject(projectId), eventPilotApi.getMemories(projectId)]);
    setProject(activeProject);
    setMemories(memory.memories);
  }

  async function pollProject(projectId: string) {
    for (let attempt = 0; attempt < 240; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const activeProject = await eventPilotApi.getProject(projectId);
      setProject(activeProject);
      if (activeProject.status !== "running") {
        if (activeProject.status === "completed") {
          const memory = await eventPilotApi.getMemories(projectId);
          setMemories(memory.memories);
          toast.success("Agent workflow complete", { description: `${memory.total} shared memories are available.` });
        } else {
          const message = "The agent workflow stopped before it could finish.";
          setError(message);
          toast.error("Workflow failed", { description: message });
        }
        return activeProject;
      }
    }
  }

  async function runWorkflow() {
    if (workflowInFlight.current || brief.trim().length < 20) return;
    workflowInFlight.current = true;
    setIsRunning(true);
    setError(null);
    setSelectedOutput(null);
    try {
      const activeProject = await eventPilotApi.createProject(brief.trim());
      window.sessionStorage.setItem("eventpilot-active-project-id", activeProject.id);
      setProject(activeProject);
      setMemories([]);
      toast.message("Agent team started", { description: "Research is analyzing the event brief." });
      await eventPilotApi.runProject(activeProject.id);
      await pollProject(activeProject.id);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "The agent workflow could not start.";
      setError(message);
      toast.error("Workflow could not start", { description: message });
    } finally {
      workflowInFlight.current = false;
      setIsRunning(false);
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || !project || isRunning || isAsking) return;
    setQuestion("");
    setIsAsking(true);
    try {
      const response = await eventPilotApi.askProject(project.id, text);
      setAnswer(response.answer);
      toast.success("Memory-grounded answer ready");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "The project assistant could not answer.";
      setError(message);
      toast.error("Project chat failed", { description: message });
    } finally {
      setIsAsking(false);
    }
  }

  async function shareProject() {
    if (sharing) return;
    setSharing(true);
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Project link copied"); }
    catch { toast.error("Could not copy the project link"); }
    finally { setSharing(false); }
  }

  function notify() {
    setNotifying(true);
    toast.message("No new notifications");
    window.setTimeout(() => setNotifying(false), 450);
  }

  function openOutput(agent: Agent) {
    setOpening(true);
    setSelectedOutput(agent);
    window.setTimeout(() => setOpening(false), 450);
  }

  function closeOutput() {
    setClosing(true);
    setSelectedOutput(null);
    window.setTimeout(() => setClosing(false), 450);
  }

  function toggleSidebar() {
    if (isMobile) setSidebarOpen((open) => !open);
    else setSidebarCollapsed((collapsed) => !collapsed);
  }

  const shellClass = ["shell", sidebarOpen ? "sidebar-open" : "", sidebarCollapsed ? "sidebar-collapsed" : ""].filter(Boolean).join(" ");

  const activities = project?.activities ?? [];
  const statusLabel = isRunning ? "Agents are coordinating..." : project?.status === "completed" ? "Project complete" : "Ready to plan";
  const memoryItems = memories.slice(0, 4);

  return <main className={shellClass}><div className="grain" /><div className="memory-ribbons"><i /><i /><i /></div>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">E</span><span>eventpilot</span></div>
      <nav>
        <Link href="/dashboard" className="nav-item active" onClick={() => setSidebarOpen(false)}>Overview</Link>
        <Link href="/dashboard/memory" className="nav-item" onClick={() => setSidebarOpen(false)}>Memory vault</Link>
        <Link href="/dashboard/runs" className="nav-item" onClick={() => setSidebarOpen(false)}>Agent runs</Link>
        <Link href="/dashboard/chat" className="nav-item" onClick={() => setSidebarOpen(false)}>Project chat</Link>
      </nav>
      <div className="sidebar-bottom"><div className="live-dot"><span /> {project ? "Project loaded" : "Ready for a project"}</div><div className="profile"><span>EP</span><b>EventPilot</b><small>Workspace</small></div></div>
      <button className="sidebar-close" type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}><X /></button>
    </aside>
    {sidebarOpen ? <button className="sidebar-backdrop" type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} /> : null}
    <section className="content"><header className="topbar"><div className="topbar-left"><button className="sidebar-trigger" type="button" aria-label={isMobile ? "Open navigation menu" : "Toggle sidebar"} title="Toggle sidebar" onClick={toggleSidebar}><PanelLeft /></button><div className="crumb"><span>Projects</span><b>/</b><strong>{project ? "Active project" : "New project"}</strong></div></div><div className="top-actions"><Button variant="outline" size="icon" className="topbar-icon" aria-label="Notifications" title="Notifications" onClick={notify}>{notifying ? <LoaderCircle className="animate-spin" /> : <Bell />}</Button><Button className="topbar-share" onClick={shareProject} disabled={sharing}>{sharing ? <LoaderCircle className="animate-spin" /> : <Share2 data-icon="inline-start" />}Share project</Button></div></header>
      <div className="hero-row"><div><div className="eyebrow"><span className="pulse" /> {project?.status === "completed" ? "COMPLETED PROJECT" : "PROJECT WORKSPACE"}</div><h1>Event <em>Pilot</em></h1><p className="hero-copy">Turn an event brief into shared research, operations, and growth decisions.</p></div><Button className={isRunning ? "run-button running" : "run-button"} onClick={runWorkflow} disabled={isRunning || brief.trim().length < 20}>{isRunning ? <LoaderCircle className="animate-spin" /> : null}{isRunning ? "Orchestrating" : project ? "Run new workflow" : "Run agent team"}</Button></div>
      {error ? <div className="api-error" role="alert"><b>Connection issue:</b> {error}</div> : null}
      <section className="mission-band"><div className="mission-intro"><span className="small-label">Event brief</span><textarea className="brief-editor" value={brief} onChange={(event) => setBrief(event.target.value)} disabled={isRunning} aria-label="Event brief" /></div><div className="stat"><b>{project ? Object.keys(project.outputs).length : 0}</b><span>agent outputs</span></div><div className="stat"><b>{memories.length}</b><span>memories</span></div><div className="stat"><b>{project?.status ?? "draft"}</b><span>workflow status</span></div></section>
      <section className="agents-section"><div className="section-heading"><div><span className="small-label">Agent ensemble</span><h2>{statusLabel}</h2></div><Link className="text-button" href="/dashboard/runs">View activity</Link></div><div className="agent-grid">{agents.map((agent) => { const output = project?.outputs[agent.name]; const active = isRunning && !output; return <article className={`agent-card ${agent.color}`} key={agent.name}><div className="agent-top"><span className="agent-mark">{agent.mark}</span><span className={active ? "status processing" : "status"}>{active ? "Working" : output ? "Complete" : "Waiting"}</span></div><h3>{agent.name}<br />Agent</h3><p>{agent.role}</p><div className="agent-footer"><span>{output ? "Output ready" : "No output yet"}</span>{output ? <button onClick={() => openOutput(agent.name)}>{opening ? <LoaderCircle className="animate-spin" /> : "Open"}</button> : null}</div></article>; })}</div></section>
      <section className="workspace-grid"><article className="memory-panel panel"><div className="panel-heading"><div><span className="small-label">Shared intelligence</span><h2>Memory vault</h2></div><Link className="icon-button" aria-label="Open memory vault" href="/dashboard/memory">Open</Link></div><p className="panel-intro">Durable facts written by the agent team.</p><div className="memory-list">{memoryItems.length ? memoryItems.map((memory, index) => <div className="memory-item" key={memory.id}><span className={`memory-orb ${["coral", "gold", "teal", "ink"][index % 4]}`} /><div><b>{memory.content.match(/^\[([^\]]+)\]/)?.[1] ?? "Agent memory"}</b><p>{memory.content.replace(/^\[[^\]]+\]\s*/, "").slice(0, 90)}</p></div><span className="memory-source">{index + 1}</span></div>) : <p className="empty-copy">Run a workflow to create project memory.</p>}</div><div className="memory-footer"><span><b>{memories.length}</b> memories stored</span><Link href="/dashboard/memory">Explore all</Link></div></article>
      <article className="activity-panel panel"><div className="panel-heading"><div><span className="small-label">Orchestrator log</span><h2>Agent activity</h2></div><span className="now">{project?.status ?? "draft"}</span></div><div className="timeline">{activities.length ? activities.slice(0, 5).map((activity, index) => <ActivityItem key={activity.id} activity={activity} index={index} />) : <p className="empty-copy">Workflow activity will appear here.</p>}</div><Button className="activity-action" variant="ghost" onClick={runWorkflow} disabled={isRunning}>{isRunning ? <LoaderCircle size={14} className="animate-spin" /> : null} Run workflow</Button></article>
      <article className="outputs-panel panel"><div className="panel-heading"><div><span className="small-label">Ready to review</span><h2>Project outputs</h2></div><span className="deliveries">{Object.keys(project?.outputs ?? {}).length} delivered</span></div>{agents.map((agent, index) => <button className="output-card" key={agent.name} disabled={!project?.outputs[agent.name]} onClick={() => openOutput(agent.name)}><span className="output-index">0{index + 1}</span><span><b>{agent.name} output</b><small>{project?.outputs[agent.name] ? "Open generated deliverable" : "Awaiting workflow"}</small></span><em>{opening ? <LoaderCircle className="animate-spin" /> : "Open"}</em></button>)}</article></section>
      {selectedOutput && project?.outputs[selectedOutput] ? <section className="output-detail"><div><span className="small-label">{selectedOutput} agent</span><h2>{selectedOutput} deliverable</h2></div><Button variant="outline" onClick={closeOutput} disabled={closing}>{closing ? <LoaderCircle className="animate-spin" /> : null} Close</Button><p>{project.outputs[selectedOutput]}</p></section> : null}
      <section className="chat-panel"><div className="chat-copy"><span className="small-label">Ask the project</span><h2>Talk to shared memory.</h2><p>Answers are grounded in the latest completed workflow.</p></div><div className="chat-area"><div className="answer"><Sparkles size={16} /><p>{answer || (project ? "Ask a question about the active project." : "Run the agent team first so shared memory can be searched.")}</p></div><form onSubmit={ask}><Input value={question} onChange={(event) => setQuestion(event.target.value)} disabled={!project || isRunning} placeholder={project ? "Ask anything about this project..." : "Run the agent team to enable chat"} aria-label="Ask the project" /><Button type="submit" variant="ghost" size="icon" disabled={!project || isRunning || isAsking || !question.trim()} aria-label="Send question">{isAsking ? <LoaderCircle size={18} className="animate-spin" /> : null}</Button></form><Link href="/dashboard/chat">Open full project chat</Link></div></section>
    </section></main>;
}

function ActivityItem({ activity, index }: { activity: Activity; index: number }) {
  return <div className="timeline-item"><span className="time">{new Date(activity.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><i className={`timeline-dot ${["coral", "ink", "teal", "gold"][index % 4]}`} /><p><b>{activity.agent}</b> {activity.message}</p></div>;
}
