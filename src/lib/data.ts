import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Campaign, CommentCounts, Content, ContentComment, PostIdea, Profile, TeamMember } from "@/lib/types";

/** The signed-in user's profile. Redirects to /login when signed out. */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  // Verified locally from the session token, so no extra round trip to Supabase Auth.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  // The allowlist check and the profile load run together.
  const [{ data: allowed }, { data }] = await Promise.all([
    // Removed from the team list since signing in: end the session.
    supabase.rpc("am_i_allowed"),
    supabase.from("profiles").select("id, full_name, avatar_url, role, team_role").eq("id", userId).single(),
  ]);
  if (!allowed) redirect("/auth/signout?error=removed");

  return (
    (data as Profile | null) ?? {
      id: userId,
      full_name: (auth?.claims?.email as string | undefined) ?? null,
      avatar_url: null,
      role: "member",
      team_role: "content_manager",
    }
  );
});

export const getTeam = cache(async (): Promise<Profile[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, team_role")
    .order("full_name");
  return (data as Profile[] | null) ?? [];
});

export async function getAllContent(): Promise<Content[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("content").select("*").order("position");
  if (error) throw new Error(error.message);
  return (data as Content[]) ?? [];
}

export async function getContent(id: string): Promise<Content | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("content").select("*").eq("id", id).maybeSingle();
  return (data as Content | null) ?? null;
}

export async function getContentBetween(fromIso: string, toIso: string): Promise<Content[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .gte("publish_at", fromIso)
    .lt("publish_at", toIso)
    .order("publish_at");
  if (error) throw new Error(error.message);
  return (data as Content[]) ?? [];
}

export async function getIdeasBetween(fromDate: string, toDate: string): Promise<PostIdea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_ideas")
    .select("*")
    .gte("idea_date", fromDate)
    .lte("idea_date", toDate)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data as PostIdea[]) ?? [];
}

export const getCampaigns = cache(async (): Promise<Campaign[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as Campaign[]) ?? [];
});

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  return (data as Campaign | null) ?? null;
}

export async function getCampaignContent(id: string): Promise<Content[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select("*")
    .eq("campaign_id", id)
    .order("publish_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as Content[]) ?? [];
}

export async function getComments(contentId: string): Promise<ContentComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_comments")
    .select("*")
    .eq("content_id", contentId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data as ContentComment[]) ?? [];
}

/** Comment and open change-request counts for every card, keyed by content id. */
export async function getCommentCounts(): Promise<Record<string, CommentCounts>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_comments")
    .select("content_id, kind, resolved")
    .in("kind", ["comment", "change_request"]);
  if (error) throw new Error(error.message);
  const counts: Record<string, CommentCounts> = {};
  for (const r of (data ?? []) as Pick<ContentComment, "content_id" | "kind" | "resolved">[]) {
    const c = (counts[r.content_id] ??= { comments: 0, openRequests: 0 });
    c.comments += 1;
    if (r.kind === "change_request" && !r.resolved) c.openRequests += 1;
  }
  return counts;
}

/** Everyone on the allowlist, for the owner's Team access page. */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("team_members");
  if (error) throw new Error(error.message);
  return (data as TeamMember[]) ?? [];
}

/** Posts assigned to one person, posts waiting for their review, and graphics asked of them. */
export async function getWorkFor(
  userId: string,
): Promise<{ assigned: Content[]; toReview: Content[]; graphics: Content[] }> {
  const supabase = await createClient();
  const [assigned, toReview, graphics] = await Promise.all([
    supabase
      .from("content")
      .select("*")
      .eq("assignee_id", userId)
      .order("publish_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("content")
      .select("*")
      .eq("reviewer_id", userId)
      .eq("status", "ready_for_review")
      .order("publish_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("content")
      .select("*")
      .eq("designer_id", userId)
      .not("graphic_status", "is", null)
      .order("publish_at", { ascending: true, nullsFirst: false }),
  ]);
  if (assigned.error) throw new Error(assigned.error.message);
  if (toReview.error) throw new Error(toReview.error.message);
  if (graphics.error) throw new Error(graphics.error.message);
  return {
    assigned: (assigned.data as Content[]) ?? [],
    toReview: (toReview.data as Content[]) ?? [],
    graphics: (graphics.data as Content[]) ?? [],
  };
}
