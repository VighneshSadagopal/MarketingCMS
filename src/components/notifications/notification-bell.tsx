"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Settings } from "lucide-react";
import { toast } from "sonner";

import { NotificationRow } from "@/components/notifications/notification-row";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOTIFICATION_SELECT, notificationHref, notificationText, type AppNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

/** The bell in the header: unread count, latest notifications, live updates. */
export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [list, count] = await Promise.all([
      supabase
        .from("notifications")
        .select(NOTIFICATION_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
    ]);
    if (!list.error) setItems((list.data ?? []) as unknown as AppNotification[]);
    if (!count.error) setUnread(count.count ?? 0);
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    // Initial load runs after mount, outside render.
    const first = setTimeout(() => void load(), 0);
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        async (payload) => {
          await load();
          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("notifications")
              .select(NOTIFICATION_SELECT)
              .eq("id", (payload.new as { id: string }).id)
              .maybeSingle();
            const n = data as unknown as AppNotification | null;
            if (n) {
              toast(notificationText(n), {
                action: { label: "Open", onClick: () => router.push(notificationHref(n)) },
              });
            }
          }
        },
      )
      .subscribe();
    return () => {
      clearTimeout(first);
      void supabase.removeChannel(channel);
    };
  }, [userId, load, router]);

  async function openItem(n: AppNotification) {
    setOpen(false);
    if (!n.read_at) {
      setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    router.push(notificationHref(n));
  }

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((cur) => cur.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    setUnread(0);
    const { error } = await createClient()
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) {
      toast.error(error.message);
      void load();
    }
  }

  const label = unread ? `Notifications, ${unread} unread` : "Notifications";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={label}
        title={label}
        className="relative flex size-11 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10"
      >
        <Bell className="size-6" strokeWidth={2.25} />
        {unread ? (
          <span
            aria-hidden
            className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-extrabold text-navy-900 shadow-[0_0_0_2px_var(--navy-900)]"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(420px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="text-base font-extrabold text-navy-800">Notifications</span>
          {unread ? (
            <button
              type="button"
              onClick={markAllRead}
              className="flex cursor-pointer items-center gap-1 text-[13px] font-bold text-blue-600"
            >
              <CheckCheck className="size-4" strokeWidth={2.5} aria-hidden />
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up. Notifications about your posts show here.
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationRow n={n} onOpen={() => openItem(n)} compact />
              </li>
            ))}
          </ul>
        )}
        <DropdownMenuSeparator className="m-0" />
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1.5 px-4 py-3 text-[13px] font-bold text-blue-600 no-underline"
        >
          <Settings className="size-4" strokeWidth={2.5} aria-hidden />
          All notifications and settings
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
