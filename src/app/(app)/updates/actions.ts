"use server";

import { headers } from "next/headers";

import { getCurrentProfile } from "@/lib/data";
import { buildDailyUpdate } from "@/lib/daily-update";

/** Owner only: builds the Slack update for the given day (YYYY-MM-DD, India time). */
export async function generateDailyUpdate(
  dayIso: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const me = await getCurrentProfile();
  if (me.role !== "owner") return { ok: false, error: "Only the owner can generate updates." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayIso)) return { ok: false, error: "Pick a valid date." };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "marketing-cms-beryl.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  try {
    return { ok: true, text: await buildDailyUpdate(dayIso, `${proto}://${host}`) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
