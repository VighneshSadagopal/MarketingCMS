import "server-only";

import { REVIEW_LEAD_HOURS, SCHEDULE_LEAD_HOURS } from "@/lib/deadlines";
import { createClient } from "@/lib/supabase/server";
import { platformLabel, statusMeta, type Content, type ContentStatus } from "@/lib/types";

const TZ = "Asia/Kolkata";
const HOUR = 60 * 60 * 1000;
const IST_OFFSET = 5.5 * HOUR; // India has no daylight saving

/** Start of a calendar day (YYYY-MM-DD) in India time, as a Date. */
function istDayStart(iso: string) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) - IST_OFFSET);
}
function addDaysIso(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function todayIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const whenLabel = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ms);
const timeLabel = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(ms);

/** Slack needs &, < and > escaped, and | would break a link label. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "-");

type Row = Pick<
  Content,
  | "id"
  | "kind"
  | "title"
  | "status"
  | "publish_at"
  | "assignee_id"
  | "reviewer_id"
  | "platforms"
  | "created_at"
  | "author_id"
>;
type Activity = { content_id: string; author_id: string | null; kind: string; body: string; created_at: string };

const MOVES: { to: string; heading: string }[] = [
  { to: "Done / Posted", heading: "Posted" },
  { to: "Ready for schedule", heading: "Approved for scheduling" },
  { to: "Ready for review", heading: "Sent for review" },
  { to: "Changes suggested", heading: "Changes suggested" },
  { to: "In progress", heading: "Started" },
];

/** Builds the owner's daily update for Slack: today's progress, tomorrow's tasks, tomorrow's posts. */
export async function buildDailyUpdate(dayIso: string, baseUrl: string) {
  const supabase = await createClient();
  const dayStart = istDayStart(dayIso);
  const tomorrowIso = addDaysIso(dayIso, 1);
  const tomorrowStart = istDayStart(tomorrowIso);
  const tomorrowEnd = istDayStart(addDaysIso(dayIso, 2));

  const [team, content, activity] = await Promise.all([
    supabase.from("profiles").select("id, full_name"),
    supabase
      .from("content")
      .select("id, kind, title, status, publish_at, assignee_id, reviewer_id, platforms, created_at, author_id"),
    supabase
      .from("content_comments")
      .select("content_id, author_id, kind, body, created_at")
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", tomorrowStart.toISOString())
      .order("created_at"),
  ]);
  if (content.error) throw new Error(content.error.message);

  const name = new Map((team.data ?? []).map((p) => [p.id, (p.full_name ?? "Someone").split(" ")[0]]));
  const who = (id: string | null) => (id ? (name.get(id) ?? "Someone") : "Unassigned");
  const rows = (content.data ?? []) as Row[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const link = (r: Row) =>
    `<${baseUrl}${r.kind === "blog" ? "/blogs/" : "/content/"}${r.id}|${esc(r.title)}>${r.kind === "blog" ? " (blog)" : ""}`;

  const lines: string[] = [];
  lines.push(`*DrupalAsia marketing update · ${dayLabel(dayIso)}*`);

  // 1. Today
  lines.push("", "*Today's update*");
  const acts = (activity.data ?? []) as Activity[];
  let todayCount = 0;
  for (const m of MOVES) {
    // Latest move per post into this column today.
    const seen = new Map<string, Activity>();
    for (const a of acts) if (a.kind === "status" && a.body.endsWith(` to ${m.to}`)) seen.set(a.content_id, a);
    const items = [...seen.values()].filter((a) => byId.has(a.content_id));
    if (!items.length) continue;
    todayCount += items.length;
    lines.push(`_${m.heading} (${items.length})_`);
    for (const a of items) {
      const r = byId.get(a.content_id)!;
      const extra = m.to === "Ready for review" && r.reviewer_id ? ` · reviewer: ${who(r.reviewer_id)}` : "";
      lines.push(`• ${link(r)} by ${who(a.author_id)}${extra}`);
    }
  }
  const created = rows.filter(
    (r) => r.created_at >= dayStart.toISOString() && r.created_at < tomorrowStart.toISOString(),
  );
  if (created.length) {
    todayCount += created.length;
    lines.push(`_New posts and ideas added (${created.length})_`);
    for (const r of created) lines.push(`• ${link(r)} · assignee: ${who(r.assignee_id)}`);
  }
  const comments = acts.filter((a) => a.kind === "comment").length;
  const requests = acts.filter((a) => a.kind === "change_request").length;
  if (comments || requests) {
    lines.push(
      `_Review activity:_ ${comments} ${comments === 1 ? "comment" : "comments"}, ${requests} change ${
        requests === 1 ? "request" : "requests"
      }`,
    );
  }
  if (!todayCount && !comments && !requests) lines.push("• No board changes today.");

  // 2. Tomorrow's tasks: the next deadline for each open post, if it falls by the end of tomorrow.
  type Task = { r: Row; due: number; what: string; owner: string | null; reviewer: string | null };
  const tasks: Task[] = [];
  for (const r of rows) {
    if (!r.publish_at || r.status === "done") continue;
    const target = Date.parse(r.publish_at);
    let due: number;
    let what: string;
    let owner: string | null = r.assignee_id;
    const before: ContentStatus[] = ["todo", "changes_suggested", "in_progress"];
    if (before.includes(r.status)) {
      due = target - REVIEW_LEAD_HOURS * HOUR;
      what = "Ready for review";
    } else if (r.status === "ready_for_review") {
      due = target - SCHEDULE_LEAD_HOURS * HOUR;
      what = "Approve for scheduling";
      owner = r.reviewer_id ?? r.assignee_id;
    } else {
      due = target; // ready_for_schedule: needs posting
      what = "Post";
    }
    if (due < tomorrowEnd.getTime() && target > dayStart.getTime() - 7 * 24 * HOUR) {
      tasks.push({ r, due, what, owner, reviewer: r.reviewer_id });
    }
  }
  tasks.sort((a, b) => a.due - b.due);
  const now = Date.now();
  const overdue = tasks.filter((t) => t.due < now);
  const laterToday = tasks.filter((t) => t.due >= now && t.due < tomorrowStart.getTime());
  const upcoming = tasks.filter((t) => t.due >= Math.max(now, tomorrowStart.getTime()));

  const taskLine = (t: Task) => {
    const parts = [
      `assignee: ${who(t.r.assignee_id)}`,
      `${t.what} by ${whenLabel(t.due)} IST`,
      `now: ${statusMeta(t.r.status).label}`,
    ];
    if (t.reviewer) parts.push(`reviewer: ${who(t.reviewer)}`);
    return `• ${link(t.r)} · ${parts.join(" · ")}`;
  };

  if (laterToday.length) {
    lines.push("", `*Due later today (${laterToday.length})*`);
    for (const t of laterToday) lines.push(taskLine(t));
  }
  lines.push("", `*Important for tomorrow (${dayLabel(tomorrowIso)})*`);
  if (!upcoming.length) lines.push("• No deadlines tomorrow.");
  for (const t of upcoming) lines.push(taskLine(t));
  if (overdue.length) {
    lines.push("", `*Overdue (${overdue.length})*`);
    for (const t of overdue) lines.push(taskLine(t));
  }

  // 3. Going out tomorrow
  const going = rows
    .filter(
      (r) =>
        r.publish_at &&
        Date.parse(r.publish_at) >= tomorrowStart.getTime() &&
        Date.parse(r.publish_at) < tomorrowEnd.getTime(),
    )
    .sort((a, b) => Date.parse(a.publish_at!) - Date.parse(b.publish_at!));
  lines.push("", `*Going out tomorrow (${going.length})*`);
  if (!going.length) lines.push("• Nothing scheduled for tomorrow.");
  for (const r of going) {
    const ready = r.status === "ready_for_schedule" || r.status === "done";
    const platforms = r.platforms.length ? ` (${r.platforms.map(platformLabel).join(", ")})` : "";
    lines.push(
      `• ${timeLabel(Date.parse(r.publish_at!))} · ${link(r)}${platforms} · ${
        ready ? "ready" : `not ready yet: ${statusMeta(r.status).label}`
      } · assignee: ${who(r.assignee_id)}`,
    );
  }

  lines.push("", `_Board: ${baseUrl}/board_`);
  return lines.join("\n");
}
