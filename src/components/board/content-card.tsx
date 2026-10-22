"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CalendarDays, Images } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { publicImageUrl } from "@/lib/supabase/client";
import { platformLabel, type Content, type Profile } from "@/lib/types";
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
  overlay = false,
  dimmed = false,
}: {
  item: Content;
  teamById: Map<string, Profile>;
  overlay?: boolean;
  dimmed?: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id, disabled: overlay });
  const people = [item.author_id, item.assignee_id, item.reviewer_id]
    .filter((id, i, arr): id is string => !!id && arr.indexOf(id) === i)
    .map((id) => teamById.get(id))
    .filter((p): p is Profile => !!p);
  const cover = item.images[0];

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
      {cover ? (
        <div className="relative h-24 overflow-hidden rounded-md bg-navy-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicImageUrl("content-images", cover)} alt="" className="size-full object-cover" />
          {item.images.length > 1 ? (
            <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold">
              <Images className="size-3" aria-hidden />
              {item.images.length}
            </span>
          ) : null}
        </div>
      ) : null}
      {item.platforms.length ? (
        <div className="flex flex-wrap gap-1.5">
          {item.platforms.map((p) => (
            <Badge key={p}>{platformLabel(p)}</Badge>
          ))}
        </div>
      ) : null}
      <span className="text-[15px] leading-snug font-bold">{item.title}</span>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground">
          <CalendarDays className="size-3.5 text-blue-600" strokeWidth={2.5} aria-hidden />
          {dateLabel(item)}
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
