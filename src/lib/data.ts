import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Content, PostIdea, Profile } from "@/lib/types";

/** The signed-in user's profile. Redirects to /login when signed out. */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
