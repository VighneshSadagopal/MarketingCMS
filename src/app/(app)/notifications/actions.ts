"use server";

import webpush from "web-push";

import { createClient } from "@/lib/supabase/server";

/** Sends a test notification to all of the signed-in person's browsers. */
export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { ok: false, message: "Browser notifications aren't set up on the server yet." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { ok: false, message: "Please sign in again." };
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", auth.claims.sub);
  if (!subs?.length) return { ok: false, message: "Turn on notifications in this browser first." };

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@drupalasia.org", pub, priv);
  const body = JSON.stringify({
    title: "DrupalAsia Marketing CMS",
    body: "Test notification: browser notifications are working.",
    url: "/notifications",
    tag: "test",
  });
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent
    ? { ok: true, message: `Test sent to ${sent} ${sent === 1 ? "browser" : "browsers"}.` }
    : { ok: false, message: "Couldn't reach your browser. Turn notifications off and on again." };
}
