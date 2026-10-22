"use client";

import { AlarmClock, AlertOctagon } from "lucide-react";

import { getDeadline } from "@/lib/deadlines";
import type { Content } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** "Review due in 1d 4h" or "Review overdue by 5h", based on the post's target date and column. */
export function DeadlineLabel({
  item,
  showDetail = false,
  className,
}: {
  item: Pick<Content, "status" | "publish_at">;
  /** Show the full explanation under the label (used on the content page). */
  showDetail?: boolean;
  className?: string;
}) {
  const now = useNow();
  if (now === null) return null;
  const d = getDeadline(item, now);
  if (!d) return null;

  const overdue = d.tone === "overdue";
  const Icon = overdue ? AlertOctagon : AlarmClock;

  return (
    <span
      title={d.detail}
      className={cn(
        "flex flex-col gap-0.5 rounded-sm px-2 py-1.5 text-[13px]",
        overdue ? "border-l-4 border-destructive bg-destructive/10" : "bg-ice-100",
        className
      )}
    >
      <span className="flex items-center gap-1.5 font-bold text-navy-800">
        <Icon className={cn("size-3.5 shrink-0", overdue ? "text-destructive" : "text-blue-600")} strokeWidth={2.5} aria-hidden />
        {overdue ? <span className="sr-only">Overdue: </span> : null}
        {d.label}
      </span>
      {showDetail ? <span className="font-medium text-muted-foreground">{d.detail}</span> : null}
    </span>
  );
}
