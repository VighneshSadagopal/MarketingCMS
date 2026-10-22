import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Campaign, CommentCounts, Content, ContentComment, PostIdea, Profile, TeamMember } from "@/lib/types";

/** The signed-in user's profile. Redirects to /login when signed out. */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Removed from the team list since signing in: end the session.
  const { data: allowed } = await supabase.rpc("am_i_allowed");
  if (!allowed) redirect("/auth/signout?error=removed");

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  return (
    (data as Profile | null) ?? {
      id: user.id,
      full_name: user.email ?? null,
      avatar_url: null,
      role: "member",
    }
  );
});

export const getTeam = cache(async (): Promise<Profile[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
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
