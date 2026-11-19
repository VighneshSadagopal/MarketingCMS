import "server-only";

import { REVIEW_LEAD_HOURS, SCHEDULE_LEAD_HOURS } from "@/lib/deadlines";
import { createClient } from "@/lib/supabase/server";
import { platformLabel, statusMeta, type Content, type ContentStatus } from "@/lib/types";

const TZ = "Asia/Kolkata";
const HOUR = 60 * 60 * 1000;
const IST_OFFSET = 5.5 * HOUR; // India has no daylight saving

/** Start of a calendar day (YYYY-MM-DD) in India time. */
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
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...o });
const longDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`))
    .replace(/^(\w+) /, "$1, ");
const shortDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const dayTime = (ms: number) =>
  `${fmt({ day: "numeric", month: "short" }).format(ms)}, ${fmt({ hour: "2-digit", minute: "2-digit" }).format(ms)} IST`;
const time = (ms: number) => `${fmt({ hour: "2-digit", minute: "2-digit" }).format(ms)} IST`;

// ---------------------------------------------------------------------------
// A tiny document model, rendered twice: HTML (pastes into Slack with bold, links and lists)
// and Slack markup text (fallback).
// ---------------------------------------------------------------------------
type Part = string | { b: string } | { href: string; text: string };
type Li = { parts: Part[]; sub?: Part[][] };
type Block = { p: Part[] } | { ul: Li[] } | { ol: Li[] } | { gap: true };

const htmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slackEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function partHtml(p: Part) {
  if (typeof p === "string") return htmlEsc(p);
  if ("b" in p) return `<b>${htmlEsc(p.b)}</b>`;
  return `<a href="${htmlEsc(p.href)}">${htmlEsc(p.text)}</a>`;
}
function partSlack(p: Part) {
  if (typeof p === "string") return slackEsc(p);
  if ("b" in p) return `*${slackEsc(p.b)}*`;
  return `<${p.href}|${slackEsc(p.text).replace(/\|/g, "-")}>`;
}
function renderHtml(blocks: Block[]) {
  const li = (l: Li) =>
    `<li>${l.parts.map(partHtml).join("")}${
      l.sub?.length ? `<ul>${l.sub.map((s) => `<li>${s.map(partHtml).join("")}</li>`).join("")}</ul>` : ""
    }</li>`;
  return blocks
    .map((b) => {
      if ("gap" in b) return "<p><br></p>";
      if ("p" in b) return `<p>${b.p.map(partHtml).join("")}</p>`;
      if ("ul" in b) return `<ul>${b.ul.map(li).join("")}</ul>`;
      return `<ol>${b.ol.map(li).join("")}</ol>`;
    })
    .join("");
}
function renderSlack(blocks: Block[]) {
  const out: string[] = [];
  for (const b of blocks) {
    if ("gap" in b) out.push("");
    else if ("p" in b) out.push(b.p.map(partSlack).join(""));
    else {
      const list = "ul" in b ? b.ul : b.ol;
      list.forEach((l, i) => {
        out.push(`${"ul" in b ? "•" : `${i + 1}.`} ${l.parts.map(partSlack).join("")}`);
        for (const s of l.sub ?? []) out.push(`      ◦ ${s.map(partSlack).join("")}`);
      });
    }
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------

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
type Activity = { content_id: string; author_id: string | null; kind: string; body: string };

/** Activity categories per person, in display order. The marker stands in for a coloured badge. */
const CATEGORIES = [
  { key: "done", to: "Done / Posted", label: "Completed / Posted", marker: "🟢" },
  { key: "approved", to: "Ready for schedule", label: "Approved for Scheduling", marker: "🟢" },
  { key: "review", to: "Ready for review", label: "Sent for Review", marker: "🔵" },
  { key: "progress", to: "In progress", label: "In Progress", marker: "🟡" },
  { key: "changes", to: "Changes suggested", label: "Changes Requested", marker: "🟡" },
  { key: "added", to: null, label: "Added", marker: "⚪" },
  { key: "overdue", to: null, label: "Overdue", marker: "🔴" },
] as const;
type CatKey = (typeof CATEGORIES)[number]["key"];

type Task = { r: Row; due: number; required: string; current: string };

/** Builds the owner's daily update: per-person activity, deadlines, tomorrow's posts and totals. */
export async function buildDailyUpdate(dayIso: string, baseUrl: string): Promise<{ html: string; text: string }> {
  const supabase = await createClient();
  const dayStart = istDayStart(dayIso);
  const tomorrowIso = addDaysIso(dayIso, 1);
  const tomorrowStart = istDayStart(tomorrowIso);
  const tomorrowEnd = istDayStart(addDaysIso(dayIso, 2));
  const now = Date.now();

  const [team, content, activity] = await Promise.all([
    supabase.from("profiles").select("id, full_name"),
    supabase
      .from("content")
      .select("id, kind, title, status, publish_at, assignee_id, reviewer_id, platforms, created_at, author_id"),
    supabase
      .from("content_comments")
      .select("content_id, author_id, kind, body")
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", tomorrowStart.toISOString())
      .order("created_at"),
  ]);
  if (content.error) throw new Error(content.error.message);

  const first = new Map((team.data ?? []).map((p) => [p.id, (p.full_name ?? "Someone").split(" ")[0]]));
  const who = (id: string | null) => (id ? (first.get(id) ?? "Someone") : "Unassigned");
  const rows = (content.data ?? []) as Row[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const link = (r: Row): Part => ({
    href: `${baseUrl}${r.kind === "blog" ? "/blogs/" : "/content/"}${r.id}`,
    text: r.kind === "blog" ? `${r.title} (blog)` : r.title,
  });

  // Per person, per category.
  const people = new Map<string, Map<CatKey, Li[]>>();
  const add = (person: string, cat: CatKey, li: Li) => {
    const cats = people.get(person) ?? new Map<CatKey, Li[]>();
    cats.set(cat, [...(cats.get(cat) ?? []), li]);
    people.set(person, cats);
  };
  const totals: Record<CatKey, number> = {
    done: 0,
    approved: 0,
    review: 0,
    progress: 0,
    changes: 0,
    added: 0,
    overdue: 0,
  };

  // Moves today: the latest move of each post into each column, credited to whoever made it.
  const acts = (activity.data ?? []) as Activity[];
  for (const c of CATEGORIES) {
    if (!c.to) continue;
    const latest = new Map<string, Activity>();
    for (const a of acts) if (a.kind === "status" && a.body.endsWith(` to ${c.to}`)) latest.set(a.content_id, a);
    for (const a of latest.values()) {
      const r = byId.get(a.content_id);
      if (!r) continue;
      const parts: Part[] = [link(r)];
      if (c.key === "review" && r.reviewer_id) parts.push(` → Reviewer: ${who(r.reviewer_id)}`);
      add(who(a.author_id), c.key, { parts });
      totals[c.key]++;
    }
  }
  for (const r of rows) {
    if (r.created_at >= dayStart.toISOString() && r.created_at < tomorrowStart.toISOString()) {
      add(who(r.author_id), "added", { parts: [link(r), ` → Assignee: ${who(r.assignee_id)}`] });
      totals.added++;
    }
  }

  // Each open post's next deadline (board rules).
  const tasks: Task[] = [];
  const before: ContentStatus[] = ["todo", "changes_suggested", "in_progress"];
  for (const r of rows) {
    if (!r.publish_at || r.status === "done") continue;
    const target = Date.parse(r.publish_at);
    if (target < dayStart.getTime() - 7 * 24 * HOUR) continue;
    if (before.includes(r.status)) {
      tasks.push({
        r,
        due: target - REVIEW_LEAD_HOURS * HOUR,
        required: "Ready for Review",
        current: statusMeta(r.status).label,
      });
    } else if (r.status === "ready_for_review") {
      tasks.push({
        r,
        due: target - SCHEDULE_LEAD_HOURS * HOUR,
        required: "Approved for Scheduling",
        current: "Ready for Review",
      });
    } else {
      tasks.push({ r, due: target, required: "Posted", current: "Ready for Schedule" });
    }
  }
  tasks.sort((a, b) => a.due - b.due);
  const overdue = tasks.filter((t) => t.due < now);
  const dueToday = tasks.filter((t) => t.due >= now && t.due < tomorrowStart.getTime());
  const dueTomorrow = tasks.filter(
    (t) => t.due >= Math.max(now, tomorrowStart.getTime()) && t.due < tomorrowEnd.getTime(),
  );

  for (const t of overdue) {
    const sub: Part[][] = [
      [`Current status: ${t.current}`],
      [`Required: ${t.required}`],
      [`Deadline: ${dayTime(t.due)}`],
    ];
    if (t.r.reviewer_id) sub.push([`Reviewer: ${who(t.r.reviewer_id)}`]);
    add(who(t.r.assignee_id), "overdue", { parts: [link(t.r)], sub });
    totals.overdue++;
  }

  // ---- Document ----
  const blocks: Block[] = [];
  blocks.push({ p: [{ b: "📊 DrupalAsia Marketing Update" }] }, { p: [longDay(dayIso)] }, { gap: true });

  const order = [...people.entries()].sort(
    (a, b) => [...b[1].values()].flat().length - [...a[1].values()].flat().length || a[0].localeCompare(b[0]),
  );
  if (!order.length) blocks.push({ p: ["No board activity today."] }, { gap: true });
  for (const [person, cats] of order) {
    blocks.push({ p: [{ b: `👤 ${person.toUpperCase()}` }] });
    for (const c of CATEGORIES) {
      const items = cats.get(c.key);
      if (!items?.length) continue;
      blocks.push({ p: [{ b: `${c.marker} ${c.label} · ${items.length}` }] }, { ul: items });
    }
    blocks.push({ gap: true });
  }

  const actionLine = (t: Task): Li => {
    const verb =
      t.required === "Posted"
        ? `${who(t.r.assignee_id)} to post it`
        : `${who(t.r.assignee_id)} to move from ${t.current} to ${t.required}`;
    const reviewer = t.r.reviewer_id && t.required !== "Posted" ? ` (reviewer: ${who(t.r.reviewer_id)})` : "";
    return { parts: [link(t.r), ` – ${verb}${reviewer}, by ${time(t.due)}.`] };
  };
  blocks.push({ p: [{ b: "⏰ DEADLINES & ACTION ITEMS" }] });
  if (dueToday.length) blocks.push({ p: [{ b: `Due today – ${shortDay(dayIso)}` }] }, { ol: dueToday.map(actionLine) });
  if (dueTomorrow.length) {
    blocks.push({ p: [{ b: `Due tomorrow – ${shortDay(tomorrowIso)}` }] }, { ol: dueTomorrow.map(actionLine) });
  }

  const going = rows
    .filter(
      (r) =>
        r.publish_at &&
        Date.parse(r.publish_at) >= tomorrowStart.getTime() &&
        Date.parse(r.publish_at) < tomorrowEnd.getTime(),
    )
    .sort((a, b) => Date.parse(a.publish_at!) - Date.parse(b.publish_at!));
  blocks.push({ p: [{ b: `Going out tomorrow – ${shortDay(tomorrowIso)}` }] });
  if (going.length) {
    blocks.push({
      ol: going.map((r) => ({
        parts: [
          link(r),
          ` – ${r.platforms.length ? r.platforms.map(platformLabel).join(", ") : "Blog"} · ${time(Date.parse(r.publish_at!))}.`,
        ],
      })),
    });
    const notReady = going.filter((r) => r.status !== "ready_for_schedule" && r.status !== "done");
    if (notReady.length) {
      const states = [...new Set(notReady.map((r) => statusMeta(r.status).label))];
      const subject =
        notReady.length === going.length
          ? going.length === 2
            ? "Both posts are"
            : going.length === 1
              ? "This post is"
              : "All posts are"
          : `${notReady.length} of these posts are`;
      blocks.push({ p: [`⚠️ ${subject} currently ${states.join(" / ")} and need approval before publishing.`] });
    }
  } else {
    blocks.push({ p: ["Nothing scheduled to go out tomorrow."] });
  }
  if (!dueTomorrow.length) blocks.push({ p: ["Tomorrow's deadlines: None."] });
  blocks.push({ gap: true });

  const comments = acts.filter((a) => a.kind === "comment").length;
  const requests = acts.filter((a) => a.kind === "change_request").length;
  blocks.push(
    { p: [{ b: "📈 TEAM ACTIVITY" }] },
    {
      ul: [
        { parts: [`Posted: ${totals.done}`] },
        { parts: [`Approved for Scheduling: ${totals.approved}`] },
        { parts: [`Sent for Review: ${totals.review}`] },
        { parts: [`Changes Requested: ${totals.changes}`] },
        { parts: [`Started: ${totals.progress}`] },
        ...(totals.added ? [{ parts: [`Added: ${totals.added}`] } as Li] : []),
        { parts: [`Overdue: ${totals.overdue}`] },
        {
          parts: [
            `Review activity: ${comments} ${comments === 1 ? "comment" : "comments"}, ${requests} change ${
              requests === 1 ? "request" : "requests"
            }`,
          ],
        },
      ],
    },
    { gap: true },
    { p: ["🔗 Marketing Board: ", { href: `${baseUrl}/board`, text: `${baseUrl}/board` }] },
  );

  return { html: renderHtml(blocks), text: renderSlack(blocks) };
}
