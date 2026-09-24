import { z } from "zod";
import { config } from "./config";

export type NigeriaEvent = { name: string; month: string; year: string; city: string; source: "live" | "seed" };
export type EventFeedStatus = { source: "live" | "seed"; count: number; updatedAt: string | null };

const feedItemSchema = z.object({ title: z.string().optional(), name: z.string().optional(), start_date: z.string().optional(), startDate: z.string().optional(), city: z.string().optional(), event_status: z.string().optional() });
const feedSchema = z.object({ data: z.array(feedItemSchema) });

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOrder = new Map(MONTHS.map((month, index) => [month, index]));

function monthOf(date: string | undefined) {
  if (!date) return null;
  const [year, month] = date.split("-");
  const monthNumber = Number(month);
  if (!year || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) return null;
  return { month: MONTHS[monthNumber - 1]!, year };
}

const SEED_EVENTS: NigeriaEvent[] = [
  { name: "Nigeria Innovation Summit", month: "October", year: "2026", city: "Lagos", source: "seed" },
  { name: "Titans of Tech Conference & Expo", month: "July", year: "2026", city: "Lagos", source: "seed" },
  { name: "ICTEL Expo", month: "July", year: "2026", city: "Lagos", source: "seed" },
  { name: "Decentralized Nigeria", month: "August", year: "2026", city: "Lagos", source: "seed" },
  { name: "NIGERCON", month: "November", year: "2026", city: "Lagos", source: "seed" },
  { name: "GrowthX by Techeconomy", month: "September", year: "2026", city: "Lagos", source: "seed" },
  { name: "GITEX Nigeria", month: "September", year: "2026", city: "Lagos", source: "seed" },
  { name: "Nigeria Fintech Forum", month: "July", year: "2026", city: "Lagos", source: "seed" },
  { name: "Art of Technology Lagos", month: "October", year: "2026", city: "Lagos", source: "seed" },
  { name: "Future of Payments: Crypto, Lightning & Global Money", month: "November", year: "2026", city: "Abuja", source: "seed" },
  { name: "Social Media Week Lagos", month: "February", year: "2026", city: "Lagos", source: "seed" },
  { name: "OSCAFEST", month: "June", year: "2026", city: "Lagos", source: "seed" },
  { name: "Lagos Startup Week", month: "October", year: "2026", city: "Lagos", source: "seed" },
  { name: "StartUp South", month: "September", year: "2026", city: "Port Harcourt", source: "seed" },
];

let events: NigeriaEvent[] = [...SEED_EVENTS];
let updatedAt: string | null = null;
let refreshInFlight: Promise<void> | null = null;

function dedupe(items: NigeriaEvent[]) {
  const seen = new Set<string>();
  return items.filter((event) => {
    const key = event.name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function refreshEventFeed() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const response = await fetch(config.NIGERIA_EVENTS_URL, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`feed responded with status ${response.status}.`);
      const raw = await response.json() as unknown;
      const parsed = feedSchema.parse(raw);
      const live: NigeriaEvent[] = [];
      for (const item of parsed.data) {
        if (item.event_status && item.event_status !== "upcoming") continue;
        const name = (item.title ?? item.name ?? "").trim();
        if (!name) continue;
        const parsedDate = monthOf(item.start_date ?? item.startDate);
        if (!parsedDate) continue;
        const city = (item.city ?? "").trim() || "Nigeria";
        live.push({ name, month: parsedDate.month, year: parsedDate.year, city, source: "live" });
      }
      if (!live.length) throw new Error("no upcoming events were found in the feed.");
      events = dedupe([...live, ...SEED_EVENTS]);
      updatedAt = new Date().toISOString();
      console.log(`[events] auto-updated with ${live.length} live Nigerian events from ${config.NIGERIA_EVENTS_URL}.`);
    } catch (error) {
      console.error(`[events] refresh failed; keeping ${events.length} cached events: ${error instanceof Error ? error.message : "Unknown feed error"}`);
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export function startEventFeedRefresh() {
  void refreshEventFeed();
  const ms = config.EVENT_FEED_REFRESH_HOURS * 60 * 60 * 1000;
  setInterval(() => { void refreshEventFeed(); }, ms);
}

export function getEventFeed() {
  return { events, meta: buildStatus() };
}

function buildStatus(): EventFeedStatus {
  const live = events.some((event) => event.source === "live");
  return { source: live ? "live" : "seed", count: events.length, updatedAt };
}

export function getCalendarFacts() {
  const sorted = [...events].sort((a, b) => (monthOrder.get(a.month) ?? 0) - (monthOrder.get(b.month) ?? 0));
  const facts = sorted
    .map((event) => `${event.name} is happening in ${event.month} ${event.year}${event.city && event.city !== "Nigeria" ? ` (${event.city})` : ""}`)
    .join("; ");
  return { facts, meta: buildStatus() };
}