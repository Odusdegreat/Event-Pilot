"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, LoaderCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eventPilotApi } from "@/lib/api";

type Message = { role: "user" | "assistant"; text: string };

export default function ProjectChatPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const savedProjectId = window.sessionStorage.getItem("eventpilot-active-project-id");
    if (!savedProjectId) return;
    eventPilotApi.getProject(savedProjectId).then(() => setProjectId(savedProjectId)).catch(() => window.sessionStorage.removeItem("eventpilot-active-project-id"));
  }, []);

  async function sendQuestion(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || !projectId || isSending) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setQuestion("");
    setIsSending(true);
    try {
      const response = await eventPilotApi.askProject(projectId, text);
      setMessages((current) => [...current, { role: "assistant", text: response.answer }]);
    } catch (error) {
      toast.error("Project chat failed", { description: error instanceof Error ? error.message : "Could not retrieve project memory." });
    } finally {
      setIsSending(false);
    }
  }

  return <main className="subpage project-chat-page"><Link href="/dashboard" className="subpage-back">Back to dashboard</Link><nav className="subpage-nav"><Link href="/dashboard/memory">Memory vault</Link><Link href="/dashboard/runs">Agent runs</Link><Link href="/dashboard/chat" className="active">Project chat</Link></nav><div className="project-chat-heading"><div><span className="small-label">Memory-grounded assistant</span><h1>Project chat</h1><p className="subpage-lede">Ask the team about its decisions, plan, or campaign. Every answer is grounded in recalled shared memory.</p></div><Sparkles aria-hidden="true" /></div><section className="project-chat-surface"><div className="project-chat-status"><Bot size={16} /><span>{projectId ? "Connected to the latest project memory" : "Run the agent team before starting a conversation"}</span></div><div className="project-chat-messages" aria-live="polite">{messages.length ? messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "EventPilot" : "You"}</span><p>{message.text}</p></div>) : <div className="chat-empty"><Sparkles size={18} /><p>{projectId ? "Ask why a decision was made, what constraints the team found, or what should happen next." : "Start a workflow on the dashboard to give this chat a project memory to search."}</p></div>}{isSending ? <div className="chat-thinking"><LoaderCircle size={15} className="animate-spin" /> Recalling project memory...</div> : null}</div><form className="project-chat-form" onSubmit={sendQuestion}><Input value={question} onChange={(event) => setQuestion(event.target.value)} disabled={!projectId || isSending} placeholder={projectId ? "Ask about this event project..." : "Run the agent team to enable chat"} aria-label="Ask the project" /><Button type="submit" size="icon" disabled={!projectId || isSending || !question.trim()} aria-label="Send question">{isSending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}</Button></form></section></main>;
}
