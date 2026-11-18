import { timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
type Payload = { title?: string; body?: string; url?: string; tag?: string; subscriptions?: Sub[] };

function sameSecret(a: string | null, b: string | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Called by the database (notification_push trigger) for each new notification.
 * Sends it to the person's browsers and reports browsers that have unsubscribed.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!sameSecret(request.headers.get("x-push-secret"), secret)) {
    return Response.json({ error: "Not allowed" }, { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return Response.json({ error: "Push keys are not set" }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@drupalasia.org", pub, priv);

  const p = (await request.json()) as Payload;
  const message = JSON.stringify({ title: p.title, body: p.body, url: p.url, tag: p.tag });
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    (p.subscriptions ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(s, message, { TTL: 60 * 60 * 24, urgency: "normal" });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint);
      }
    }),
  );

  if (gone.length) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await db.rpc("prune_push_subscriptions", { p_secret: secret, p_endpoints: gone });
  }
  return Response.json({ sent, removed: gone.length });
}
