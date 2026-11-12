"use server";

import { revalidateTag } from "next/cache";

import { SHARED_TAGS, type SharedTag } from "@/lib/shared-cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Called after someone changes team members, campaigns or comments in the browser,
 * so the next page load shows the change instead of the cached copy.
 */
export async function refreshShared(tags: SharedTag[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return;
  for (const tag of tags) {
    if (SHARED_TAGS.includes(tag)) revalidateTag(tag, { expire: 0 });
  }
}
