export const STATUSES = [
  { id: "todo", label: "Todo", dot: "#ffffff" },
  { id: "changes_suggested", label: "Changes suggested", dot: "#f86802" },
  { id: "in_progress", label: "In progress", dot: "#0462d2" },
  { id: "ready_for_review", label: "Ready for review", dot: "#38d9f5" },
  { id: "ready_for_schedule", label: "Ready for schedule", dot: "#0342a5" },
  { id: "done", label: "Done / Posted", dot: "#031a4b" },
] as const;

export type ContentStatus = (typeof STATUSES)[number]["id"];

/** Statuses only the owner may move content into. */
export const OWNER_ONLY_STATUSES: ContentStatus[] = ["ready_for_schedule", "done"];

export function statusMeta(id: ContentStatus) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
}

export const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X" },
  { id: "instagram", label: "Instagram" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["id"];

export function platformLabel(id: string) {
  return PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

export const X_WORD_LIMIT = 200;
export const MAX_IMAGES = 4;

export type Role = "owner" | "member";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
};

export type Content = {
  id: string;
  title: string;
  brief: string | null;
  status: ContentStatus;
  platforms: Platform[];
  copy_linkedin: string | null;
  copy_x: string | null;
  copy_instagram: string | null;
  hashtags: string | null;
  link_url: string | null;
  images: string[];
  author_id: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  publish_at: string | null;
  position: number;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PostIdea = {
  id: string;
  idea_date: string;
  text: string;
  platforms: Platform[];
  created_by: string;
  created_at: string;
  /** The Todo card created with this idea. */
  content_id: string | null;
  campaign_id: string | null;
};

export const CAMPAIGN_STATUSES = [
  { id: "planning", label: "Planning" },
  { id: "active", label: "Active" },
  { id: "finished", label: "Finished" },
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]["id"];

export function campaignStatusLabel(id: string) {
  return CAMPAIGN_STATUSES.find((s) => s.id === id)?.label ?? id;
}

/** Campaign colours. Used as markers (dots, bars), never behind text. */
export const CAMPAIGN_COLORS = [
  { value: "#0462d2", label: "Blue" },
  { value: "#f86802", label: "Orange" },
  { value: "#38d9f5", label: "Cyan" },
  { value: "#0342a5", label: "Deep blue" },
  { value: "#1a8a5a", label: "Green" },
  { value: "#7a4fd8", label: "Purple" },
  { value: "#d6336c", label: "Pink" },
  { value: "#031a4b", label: "Navy" },
] as const;

export type Campaign = {
  id: string;
  name: string;
  brief: string | null;
  start_date: string | null;
  end_date: string | null;
  color: string;
  default_hashtags: string | null;
  default_link: string | null;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
};

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** "1 Nov 2026 - 30 Jan 2027", or a fallback when dates are missing. */
export function campaignDateRange(c: Pick<Campaign, "start_date" | "end_date">) {
  const f = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return shortDate.format(new Date(y, m - 1, day));
  };
  if (c.start_date && c.end_date) return `${f(c.start_date)} - ${f(c.end_date)}`;
  if (c.start_date) return `From ${f(c.start_date)}`;
  if (c.end_date) return `Until ${f(c.end_date)}`;
  return "No dates set";
}

export type CommentKind = "comment" | "change_request" | "status";

export type ContentComment = {
  id: string;
  content_id: string;
  author_id: string | null;
  kind: CommentKind;
  body: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

/** Per-card counts shown on the board. */
export type CommentCounts = { comments: number; openRequests: number };
