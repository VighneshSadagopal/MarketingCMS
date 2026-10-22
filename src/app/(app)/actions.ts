"use server";

import { revalidatePath } from "next/cache";

import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ONLY_STATUSES, STATUSES, type ContentStatus } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

function isStatus(v: string): v is ContentStatus {
  return STATUSES.some((s) => s.id === v);
}

export async function updateContentStatus(id: string, status: string, position?: number): Promise<Result> {
  if (!isStatus(status)) return { ok: false, error: "Unknown status" };
  const supabase = await createClient();

  if (OWNER_ONLY_STATUSES.includes(status)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").single();
    if (me?.role !== "owner") return { ok: false, error: "Only the owner can move content there." };
  }

  const patch: { status: ContentStatus; position?: number } = { status };
  if (typeof position === "number") patch.position = position;

  const { error } = await supabase.from("content").update(patch).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };

  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath(`/content/${id}`);
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteContent(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("content").select("images").eq("id", id).single();
  const { error } = await supabase.from("content").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (row?.images?.length) {
    await supabase.storage.from("content-images").remove(row.images as string[]);
  }
  revalidatePath("/");
  revalidatePath("/board");
  revalidatePath("/calendar");
  return { ok: true };
}
