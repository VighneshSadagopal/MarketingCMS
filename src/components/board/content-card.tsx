"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CalendarDays, CheckCircle2, MessageCircle, Palette, PencilLine, UserRound } from "lucide-react";

import { CampaignTag } from "@/components/campaigns/campaign-tag";
import { DeadlineLabel } from "@/components/content/deadline-label";
import { UserAvatar } from "@/components/user-avatar";
import {
  contentPath,
  readingMinutes,
  type Campaign,
  type CommentCounts,
  type Content,
  type Profile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});
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
  if (c.status === "done") return `${c.kind === "blog" ? "Published" : "Posted"} ${dateFmt.format(d)}`;
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
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: item.id,
    disabled: overlay,
  });
  // Who the card is waiting on: the reviewer while it's in Ready for review, otherwise the assignee.
  const reviewing = item.status === "ready_for_review";
  const ownerId = reviewing ? item.reviewer_id : item.assignee_id;
  const person = ownerId ? teamById.get(ownerId) : undefined;
  const roleText = reviewing ? "Reviewer" : "Assigned to";

  return (
    <Link
      ref={setNodeRef}
      href={contentPath(item)}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable content card"
      className={cn(
        "flex touch-none flex-col gap-3 rounded-xl border border-border bg-white p-4 text-navy-800 no-underline hover:border-input",
        overlay && "rotate-1 shadow-xl",
        dimmed && "opacity-40",
      )}
    >
      <span className="text-[15px] leading-snug font-bold">{item.title}</span>
      {item.kind === "blog" ? (
        <span className="text-[13px] font-semibold text-muted-foreground">
          {readingMinutes(item.body).words ? `${readingMinutes(item.body).words} words` : "Idea, not written yet"}
        </span>
      ) : null}
      {campaign ? <CampaignTag campaign={campaign} className="self-start" /> : null}
      <DeadlineLabel item={item} />
      {item.graphic_status ? (
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[13px] font-semibold",
            item.graphic_status === "requested" ? "bg-cyan-300/20" : "bg-ice-100",
          )}
        >
          {item.graphic_status === "requested" ? (
            <Palette className="size-3.5 text-blue-600" strokeWidth={2.5} aria-hidden />
          ) : (
            <CheckCircle2 className="size-3.5 text-blue-600" strokeWidth={2.5} aria-hidden />
          )}
          {item.graphic_status === "requested" ? "Graphic requested" : "Graphic delivered"}
          {item.designer_id && teamById.get(item.designer_id)
            ? ` · ${teamById.get(item.designer_id)!.full_name?.split(" ")[0] ?? "Designer"}`
            : ""}
        </span>
      ) : null}
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
        {person ? (
          <span
            className="flex min-w-0 items-center gap-1.5"
            title={`${roleText}: ${person.full_name ?? "Team member"}`}
          >
            <span className="flex min-w-0 flex-col items-end leading-tight">
              <span className="text-[11px] font-semibold text-muted-foreground">{roleText}</span>
              <span className="truncate text-[13px] font-bold">
                {person.full_name?.split(" ")[0] ?? "Team member"}
              </span>
            </span>
            <UserAvatar
              profile={person}
              className={cn("size-8 shrink-0 text-[11px]", reviewing && "ring-2 ring-blue-600 ring-offset-1")}
            />
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            {reviewing ? "No reviewer" : "Unassigned"}
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-dashed border-input"
            >
              <UserRound className="size-4" />
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
