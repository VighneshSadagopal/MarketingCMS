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
};
