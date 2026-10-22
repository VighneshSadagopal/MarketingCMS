"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { updateContentStatus } from "@/app/(app)/actions";
import { ContentCard } from "@/components/board/content-card";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  OWNER_ONLY_STATUSES,
  PLATFORMS,
  STATUSES,
  type Content,
  type ContentStatus,
  type Profile,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function KanbanBoard({
  initialItems,
  team,
  me,
}: {
  initialItems: Content[];
  team: Profile[];
  me: Profile;
}) {
  const [items, setItems] = useState(initialItems);
  const [syncedFrom, setSyncedFrom] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [member, setMember] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Take fresh server data after a refresh, without an effect.
  if (initialItems !== syncedFrom) {
    setSyncedFrom(initialItems);
    setItems(initialItems);
  }

  const teamById = useMemo(() => new Map(team.map((p) => [p.id, p])), [team]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const visible = items.filter((c) => {
    if (query && !c.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (platform !== "all" && !c.platforms.includes(platform as Content["platforms"][number])) return false;
    if (member && c.author_id !== member && c.assignee_id !== member && c.reviewer_id !== member) return false;
    return true;
  });

  const isOwner = me.role === "owner";

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const target = e.over?.id as ContentStatus | undefined;
    const item = items.find((c) => c.id === id);
    if (!item || !target || item.status === target) return;

    if (!isOwner && OWNER_ONLY_STATUSES.includes(target)) {
      toast.error("Only the owner can move content to that column.");
      return;
    }

    const position = Date.now() / 1000;
    const previous = items;
    setItems((cur) => cur.map((c) => (c.id === id ? { ...c, status: target, position } : c)));
    startTransition(async () => {
      const res = await updateContentStatus(id, target, position);
      if (!res.ok) {
        setItems(previous);
        toast.error(res.error);
      }
    });
  }

  const active = activeId ? items.find((c) => c.id === activeId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-11 items-center gap-2 rounded-sm border border-input bg-white px-3">
          <Search className="size-4 text-blue-600" strokeWidth={2.5} aria-hidden />
          <span className="sr-only">Search content</span>
          <Input
            type="search"
            placeholder="Search content"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-52 border-0 px-0"
          />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" id="platform-filter">
            Platform
          </span>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-44" aria-labelledby="platform-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div role="group" aria-label="Filter by team member" className="flex items-center pl-2">
          {team.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={member === p.id}
              aria-label={`Show content for ${p.full_name ?? "team member"}`}
              onClick={() => setMember(member === p.id ? null : p.id)}
              className={cn(
                "-ml-2 cursor-pointer rounded-full border-[3px]",
                member === p.id ? "border-blue-600" : "border-ice-100"
              )}
            >
              <UserAvatar profile={p} className="size-10" />
            </button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-[repeat(6,minmax(240px,1fr))] items-start gap-4">
            {STATUSES.map((s) => (
              <Column
                key={s.id}
                status={s.id}
                label={s.label}
                dot={s.dot}
                locked={!isOwner && OWNER_ONLY_STATUSES.includes(s.id)}
                items={visible.filter((c) => c.status === s.id).sort((a, b) => a.position - b.position)}
                teamById={teamById}
                activeId={activeId}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {active ? <ContentCard item={active} teamById={teamById} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  status,
  label,
  dot,
  locked,
  items,
  teamById,
  activeId,
}: {
  status: ContentStatus;
  label: string;
  dot: string;
  locked: boolean;
  items: Content[];
  teamById: Map<string, Profile>;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: locked });

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "flex min-h-40 flex-col gap-3 rounded-2xl border bg-navy-800/5 p-3 transition-colors",
        isOver ? "border-blue-600 bg-blue-600/10" : "border-border"
      )}
    >
      <div className="flex min-h-9 items-center justify-between gap-2 px-1 pt-1">
        <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
          <span
            aria-hidden
            className="size-2.5 rounded-full shadow-[inset_0_0_0_1.5px_rgba(3,26,75,0.35)]"
            style={{ background: dot }}
          />
          {label}
          <span className="rounded-full bg-white px-2 py-0.5 text-[13px] font-bold text-muted-foreground">
            {items.length}
          </span>
        </h2>
        {status === "todo" ? (
          <Link
            href="/content/new"
            aria-label="Add content to Todo"
            className="flex size-9 items-center justify-center rounded-md text-blue-600 hover:bg-white"
          >
            <Plus className="size-[18px]" strokeWidth={2.5} />
          </Link>
        ) : null}
      </div>
      {locked ? <p className="px-1 text-xs font-semibold text-muted-foreground">Owner moves cards here</p> : null}
      {items.map((c) => (
        <ContentCard key={c.id} item={c} teamById={teamById} dimmed={activeId === c.id} />
      ))}
    </section>
  );
}
