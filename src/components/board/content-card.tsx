"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CalendarDays, MessageCircle, PencilLine } from "lucide-react";

import { CampaignTag } from "@/components/campaigns/campaign-tag";
import { DeadlineLabel } from "@/components/content/deadline-label";
import { UserAvatar } from "@/components/user-avatar";
import type { Campaign, CommentCounts, Content, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function dateLabel(c: Content) {
  if (!c.publish_at) return "No date";
  const d = new Date(c.publish_at);
  if (c.status === "done") return `Posted ${dateFmt.format(d)}`;
  if (c.status === "ready_for_schedule") return dateTimeFmt.format(d);
  return `Due ${dateFmt.format(d)}`;
}

export function ContentCard({
  item,
  teamById,
  campaign,
  counts,
  overlay = false,
  dimmed = false,
}: {
  item: Content;
  teamById: Map<string, Profile>;
  campaign?: Campaign;
  counts?: CommentCounts;
  overlay?: boolean;
  dimmed?: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id, disabled: overlay });
  const people = [item.author_id, item.assignee_id, item.reviewer_id]
    .filter((id, i, arr): id is string => !!id && arr.indexOf(id) === i)
    .map((id) => teamById.get(id))
    .filter((p): p is Profile => !!p);

  return (
    <Link
      ref={setNodeRef}
      href={`/content/${item.id}`}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable content card"
      className={cn(
        "flex touch-none flex-col gap-3 rounded-xl border border-border bg-white p-4 text-navy-800 no-underline hover:border-input",
        overlay && "rotate-1 shadow-xl",
        dimmed && "opacity-40"
      )}
    >
      <span className="text-[15px] leading-snug font-bold">{item.title}</span>
      {campaign ? <CampaignTag campaign={campaign} className="self-start" /> : null}
      <DeadlineLabel item={item} />
      {counts?.openRequests ? (
        <span className="flex items-center gap-1.5 rounded-sm bg-orange-500/10 px-2 py-1.5 text-[13px] font-semibold">
          <PencilLine className="size-3.5 text-orange-500" strokeWidth={2.5} aria-hidden />
          {counts.openRequests} {counts.openRequests === 1 ? "change" : "changes"} requested
        </span>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground">
          <CalendarDays className="size-3.5 text-blue-600" strokeWidth={2.5} aria-hidden />
          {dateLabel(item)}
          {counts?.comments ? (
            <span className="ml-2 flex items-center gap-1" aria-label={`${counts.comments} comments`}>
              <MessageCircle className="size-3.5 text-blue-600" strokeWidth={2.5} aria-hidden />
              {counts.comments}
            </span>
          ) : null}
        </span>
        <span className="flex">
          {people.map((p) => (
            <UserAvatar key={p.id} profile={p} className="-ml-1.5 size-7 border-2 border-white text-[11px]" />
          ))}
        </span>
      </div>
    </Link>
  );
}
