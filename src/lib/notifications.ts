export const NOTIFICATION_KINDS = [
  { id: "assigned", label: "A post or blog is assigned to me" },
  { id: "review_requested", label: "A card I review reaches Ready for review" },
  { id: "changes_suggested", label: "Changes are suggested on my post" },
  { id: "comment", label: "New comments on posts I'm on" },
  { id: "graphic_requested", label: "A graphic is requested from me" },
  { id: "graphic_delivered", label: "A graphic is delivered for my post" },
  { id: "approved", label: "My post is approved for scheduling" },
  { id: "deadline", label: "Deadline reminders (daily, 9:00 IST)" },
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]["id"];

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  content_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string | null;
  count: number;
  read_at: string | null;
  created_at: string;
  actor: { id: string; full_name: string | null; avatar_url: string | null } | null;
  content: { kind: "post" | "blog" } | null;
};

/** Columns to select, with the actor's name and photo and whether it's a post or blog. */
export const NOTIFICATION_SELECT =
  "id, user_id, actor_id, content_id, kind, title, body, count, read_at, created_at, " +
  "actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_url), content:content(kind)";

/** Same wording as public.notification_text() in the database (used for push). */
export function notificationText(n: Pick<AppNotification, "kind" | "title" | "body" | "count" | "actor">) {
  const who = n.actor?.full_name?.split(" ")[0] ?? "Someone";
  const t = `"${n.title}"`;
  const note = n.body ? `: ${n.body}` : "";
  switch (n.kind) {
    case "assigned":
      return `${who} assigned you ${t}`;
    case "review_requested":
      return `${who} sent ${t} for your review`;
    case "changes_suggested":
      return `${who} suggested changes on ${t}${note}`;
    case "comment":
      return n.count > 1 ? `${n.count} new comments on ${t}` : `${who} commented on ${t}${note}`;
    case "graphic_requested":
      return `${who} asked you for a graphic for ${t}${note}`;
    case "graphic_delivered":
      return `${n.actor?.full_name?.split(" ")[0] ?? "The designer"} delivered the graphic for ${t}`;
    case "approved":
      return `${who} approved ${t} for scheduling`;
    case "deadline":
      return `${t}: ${n.body ?? "deadline coming up"}`;
    default:
      return n.title;
  }
}

export function notificationHref(n: Pick<AppNotification, "kind" | "content_id" | "content">) {
  if (!n.content_id) return "/notifications";
  const base = n.content?.kind === "blog" ? `/blogs/${n.content_id}` : `/content/${n.content_id}`;
  return n.kind === "comment" || n.kind === "changes_suggested" ? `${base}#activity` : base;
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
