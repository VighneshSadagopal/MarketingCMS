"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { NotificationRow } from "@/components/notifications/notification-row";
import { PushToggle } from "@/components/notifications/push-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { NOTIFICATION_KINDS, notificationHref, type AppNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

export function NotificationsView({
  userId,
  initial,
  muted: initialMuted,
  vapidPublicKey,
}: {
  userId: string;
  initial: AppNotification[];
  muted: string[];
  vapidPublicKey: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [muted, setMuted] = useState<string[]>(initialMuted);
  const [pending, startTransition] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  async function openItem(n: AppNotification) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      await createClient().from("notifications").update({ read_at: now }).eq("id", n.id);
    }
    router.push(notificationHref(n));
  }

  function markAllRead() {
    const now = new Date().toISOString();
    setItems((cur) => cur.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    startTransition(async () => {
      const { error } = await createClient()
        .from("notifications")
        .update({ read_at: now })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) toast.error(error.message);
      router.refresh();
    });
  }

  function toggleKind(id: string, on: boolean) {
    const next = on ? muted.filter((k) => k !== id) : [...muted, id];
    setMuted(next);
    startTransition(async () => {
      const { error } = await createClient()
        .from("notification_settings")
        .upsert({ user_id: userId, muted: next, updated_at: new Date().toISOString() });
      if (error) {
        toast.error(error.message);
        setMuted(muted);
        return;
      }
      toast.success("Notification settings saved.");
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="list-h" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-h" className="text-xl font-extrabold">
            Latest{" "}
            {unread ? <span className="text-base font-bold text-muted-foreground">· {unread} unread</span> : null}
          </h2>
          {unread ? (
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={pending}>
              <CheckCheck strokeWidth={2.5} />
              Mark all read
            </Button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
            No notifications yet. You&apos;ll hear about posts assigned to you, reviews, comments, graphics and
            deadlines here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationRow n={n} onOpen={() => openItem(n)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
        <PushToggle vapidPublicKey={vapidPublicKey} />
        <Card>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xl font-extrabold">What to notify me about</legend>
            <p className="text-sm text-muted-foreground">
              Applies to the bell and to browser notifications. You&apos;re never notified about your own actions.
            </p>
            {NOTIFICATION_KINDS.map((k) => {
              const on = !muted.includes(k.id);
              return (
                <label key={k.id} className="flex cursor-pointer items-start gap-3 text-[15px] font-semibold">
                  <Checkbox
                    className="mt-0.5"
                    checked={on}
                    disabled={pending}
                    onCheckedChange={(v) => toggleKind(k.id, v === true)}
                  />
                  {k.label}
                </label>
              );
            })}
          </fieldset>
        </Card>
      </aside>
    </div>
  );
}
