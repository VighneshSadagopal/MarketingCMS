import "server-only";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export type PublicPost = {
  id: string;
  title: string;
  publish_at: string;
  campaign_id: string | null;
  platforms: string[];
};
export type PublicIdea = {
  id: string;
  idea_date: string;
  text: string;
  campaign_id: string | null;
  platforms: string[];
  content_id: string | null;
};
export type PublicCampaign = { id: string; name: string; color: string };
export type PublicCalendar = { posts: PublicPost[]; ideas: PublicIdea[]; campaigns: PublicCampaign[] };

/**
 * The public calendar's data, read without signing in through the public_calendar() database
 * function (titles, dates, campaigns and platforms only). Cached for a minute.
 */
export const getPublicCalendar = unstable_cache(
  async (from: string, to: string): Promise<PublicCalendar> => {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await db.rpc("public_calendar", { p_from: from, p_to: to });
    if (error) throw new Error(error.message);
    return (data as PublicCalendar | null) ?? { posts: [], ideas: [], campaigns: [] };
  },
  ["public-calendar"],
  { revalidate: 60, tags: ["public-calendar"] },
);
