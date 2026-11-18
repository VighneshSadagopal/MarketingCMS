"use client";

import { AlarmClock } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { notificationText, timeAgo, type AppNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function NotificationRow({
  n,
  onOpen,
  compact = false,
}: {
  n: AppNotification;
  onOpen: () => void;
  compact?: boolean;
}) {
  const unread = !n.read_at;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left text-navy-800 hover:bg-ice-100",
        unread && "bg-ice-100/60",
        !compact && "rounded-xl border border-border bg-white",
      )}
    >
      {n.kind === "deadline" || !n.actor ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
          <AlarmClock className="size-5" strokeWidth={2.5} aria-hidden />
        </span>
      ) : (
        <UserAvatar profile={n.actor} className="size-9 shrink-0 text-xs" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm leading-snug [overflow-wrap:anywhere]", unread ? "font-bold" : "font-medium")}>
          <span className={compact ? "line-clamp-3" : undefined}>{notificationText(n)}</span>
        </span>
        <span className="text-xs font-semibold text-muted-foreground">{timeAgo(n.created_at)}</span>
      </span>
      {unread ? <span aria-label="Unread" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-blue-600" /> : null}
    </button>
  );
}
