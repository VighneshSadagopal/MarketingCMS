"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarClock, ChevronLeft, ChevronRight, GripVertical, Plus, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import { CampaignTag } from "@/components/campaigns/campaign-tag";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createClient } from "@/lib/supabase/client";
import {
  canCreateContent,
  PLATFORMS,
  platformLabel,
  statusMeta,
  type Campaign,
  type Content,
  type Platform,
  type PostIdea,
  type Profile,
} from "@/lib/types";
import { cn, toIsoDate } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;
const NO_CAMPAIGN = "none";

type Chip = {
  key: string;
  text: string;
  kind: "post" | "idea";
  color?: string;
};

function ChipBody({ chip, dragging }: { chip: Chip; dragging?: boolean }) {
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs leading-snug font-semibold",
        chip.kind === "post"
          ? "border border-navy-800 bg-navy-800 text-white"
          : "border-[1.5px] border-dashed border-input bg-white text-navy-800",
        dragging && "shadow-lg ring-2 ring-blue-600",
      )}
    >
      {chip.color ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full shadow-[0_0_0_1px_#fff]"
          style={{ background: chip.color }}
        />
      ) : null}
      <span className="truncate">{chip.text}</span>
    </span>
  );
}

/** Idea chips can be dragged onto another day. */
function IdeaChip({ chip }: { chip: Chip }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: chip.key,
  });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role={undefined}
      tabIndex={undefined}
      title="Drag to another date"
      className={cn("w-full cursor-grab touch-none", isDragging && "opacity-40")}
    >
      <ChipBody chip={chip} />
    </span>
  );
}

function DayCell({ iso, className, children, ...props }: React.ComponentProps<"button"> & { iso: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: iso });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(className, isOver && "bg-ice-100 ring-2 ring-blue-500")}
      {...props}
    >
      {children}
    </button>
  );
}

function monthParam(y: number, m: number) {
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CalendarView({
  year,
  month,
  initialSelected,
  ideas: serverIdeas,
  posts,
  campaigns,
  me,
}: {
  year: number;
  month: number;
  initialSelected?: string;
  ideas: PostIdea[];
  posts: Content[];
  campaigns: Campaign[];
  me: Profile;
}) {
  const router = useRouter();
  const todayIso = toIsoDate(new Date());
  const firstIso = toIsoDate(new Date(year, month, 1));
  const [selected, setSelected] = useState(
    initialSelected && /^\d{4}-\d{2}-\d{2}$/.test(initialSelected)
      ? initialSelected
      : todayIso.startsWith(monthParam(year, month))
        ? todayIso
        : firstIso,
  );
  const [draft, setDraft] = useState("");
  const [draftPlatforms, setDraftPlatforms] = useState<Platform[]>(["linkedin"]);
  const [draftCampaign, setDraftCampaign] = useState(NO_CAMPAIGN);
  const [pending, startTransition] = useTransition();
  // Dates of ideas moved here but not yet confirmed by a refresh (so the chip moves at once).
  const [movedTo, setMovedTo] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [moveDates, setMoveDates] = useState<Record<string, string>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const ideas = useMemo(
    () => serverIdeas.map((i) => (movedTo[i.id] ? { ...i, idea_date: movedTo[i.id] } : i)),
    [serverIdeas, movedTo],
  );

  const ideasByDate = useMemo(() => {
    const map = new Map<string, PostIdea[]>();
    for (const i of ideas) map.set(i.idea_date, [...(map.get(i.idea_date) ?? []), i]);
    return map;
  }, [ideas]);

  const postsById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const campaignById = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);

  const postsByDate = useMemo(() => {
    // A card created from an idea shows as that idea, not twice.
    // If the card was rescheduled to another date, it shows there as a planned post.
    const ideaDateByContent = new Map(ideas.filter((i) => i.content_id).map((i) => [i.content_id, i.idea_date]));
    const movedCards = new Set(ideas.filter((i) => movedTo[i.id] && i.content_id).map((i) => i.content_id));
    const map = new Map<string, Content[]>();
    for (const p of posts) {
      if (!p.publish_at || movedCards.has(p.id)) continue;
      const key = toIsoDate(new Date(p.publish_at));
      if (ideaDateByContent.get(p.id) === key) continue;
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [posts, ideas, movedTo]);

  /** Campaigns with a post or idea due on the given day (not every day in the campaign's range). */
  const campaignsOn = (iso: string) => {
    const ids = new Set(
      [...(postsByDate.get(iso) ?? []), ...(ideasByDate.get(iso) ?? [])]
        .map((x) => x.campaign_id)
        .filter((id): id is string => !!id),
    );
    return campaigns.filter((c) => ids.has(c.id));
  };

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, k) => {
      const d = new Date(year, month, 1 - offset + k);
      return { date: d, iso: toIsoDate(d), inMonth: d.getMonth() === month };
    });
  }, [year, month]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const [sy, sm, sd] = selected.split("-").map(Number);
  const selectedLabel = new Date(sy, sm - 1, sd).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const selPosts = postsByDate.get(selected) ?? [];
  const selIdeas = ideasByDate.get(selected) ?? [];
  // Campaigns with something due in the visible weeks.
  const visibleIds = new Set(cells.flatMap((c) => campaignsOn(c.iso).map((x) => x.id)));
  const monthCampaigns = campaigns.filter((c) => visibleIds.has(c.id));

  function addIdea(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    startTransition(async () => {
      // Creates the idea and its Todo card on the board together.
      const { error } = await createClient().rpc("create_post_idea", {
        p_idea_date: selected,
        p_text: text,
        p_platforms: draftPlatforms,
        p_campaign_id: draftCampaign === NO_CAMPAIGN ? null : draftCampaign,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setDraft("");
      toast.success("Idea added to Todo on the board.");
      router.refresh();
    });
  }

  function removeIdea(idea: PostIdea) {
    startTransition(async () => {
      // Only the idea goes; its card stays on the board.
      const { error } = await createClient().from("post_ideas").delete().eq("id", idea.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(idea.content_id ? "Idea removed. Its card stays on the board." : "Idea removed.");
      router.refresh();
    });
  }

  function moveIdea(idea: PostIdea, newDate: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || newDate === idea.idea_date) return;
    setMovedTo((m) => ({ ...m, [idea.id]: newDate }));
    startTransition(async () => {
      // Moves the idea and its card's target date (same time of day).
      const { error } = await createClient().rpc("move_post_idea", {
        p_idea_id: idea.id,
        p_new_date: newDate,
      });
      if (error) {
        setMovedTo((m) => {
          const next = { ...m };
          delete next[idea.id];
          return next;
        });
        toast.error(error.message);
        return;
      }
      const label = new Date(newDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
      toast.success(idea.content_id ? `Idea and its card moved to ${label}.` : `Idea moved to ${label}.`);
      router.refresh();
    });
  }

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const idea = ideas.find((i) => i.id === e.active.id);
    if (idea && e.over) moveIdea(idea, String(e.over.id));
  }

  const dragIdea = dragId ? ideas.find((i) => i.id === dragId) : undefined;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            DrupalAsia Connect India 2027
          </span>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Social media calendar</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 text-[13px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-3.5 rounded-sm bg-navy-800" />
              Planned post
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-3.5 rounded-sm border-[1.5px] border-dashed border-input bg-white" />
              Idea
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild>
              <Link href={`/calendar?month=${monthParam(year, month - 1)}`} aria-label="Previous month">
                <ChevronLeft strokeWidth={2.5} />
              </Link>
            </Button>
            <h2 aria-live="polite" className="min-w-44 text-center text-xl font-extrabold">
              {monthLabel}
            </h2>
            <Button variant="outline" size="icon" asChild>
              <Link href={`/calendar?month=${monthParam(year, month + 1)}`} aria-label="Next month">
                <ChevronRight strokeWidth={2.5} />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/calendar?date=${todayIso}`}>Today</Link>
            </Button>
          </div>
        </div>
      </div>

      {monthCampaigns.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold text-muted-foreground">Campaigns this month</span>
          {monthCampaigns.map((c) => (
            <Link key={c.id} href={`/campaigns/${c.id}`} className="no-underline">
              <CampaignTag campaign={c} className="hover:border-input" />
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-[999_1_760px] overflow-x-auto">
          <div className="min-w-[720px] rounded-2xl border border-border bg-white p-3">
            <div className="grid grid-cols-7 gap-1.5 pb-1.5">
              {WEEKDAYS.map((w) => (
                <span key={w} className="px-2 py-1 text-[13px] font-bold text-muted-foreground">
                  {w}
                </span>
              ))}
            </div>
            <DndContext
              sensors={sensors}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={() => setDragId(null)}
            >
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((c) => {
                  const items: Chip[] = [
                    ...(postsByDate.get(c.iso) ?? []).map((p) => ({
                      key: p.id,
                      text: p.title,
                      kind: "post" as const,
                      color: p.campaign_id ? campaignById.get(p.campaign_id)?.color : undefined,
                    })),
                    ...(ideasByDate.get(c.iso) ?? []).map((i) => ({
                      key: i.id,
                      text: i.text,
                      kind: "idea" as const,
                      color: i.campaign_id ? campaignById.get(i.campaign_id)?.color : undefined,
                    })),
                  ];
                  const running = campaignsOn(c.iso);
                  const isSel = c.iso === selected;
                  const isToday = c.iso === todayIso;
                  return (
                    <DayCell
                      key={c.iso}
                      iso={c.iso}
                      onClick={() => setSelected(c.iso)}
                      aria-pressed={isSel}
                      aria-label={`${c.date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}, ${items.length} items`}
                      className={cn(
                        "flex min-h-[116px] min-w-0 cursor-pointer flex-col gap-1 rounded-md p-2 text-left",
                        isSel ? "border-2 border-blue-600" : "border border-border hover:border-input",
                        c.inMonth ? "bg-white text-navy-800" : "bg-ice-100/60 text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-sm font-extrabold",
                          isToday && "bg-blue-600 text-white",
                        )}
                      >
                        {c.date.getDate()}
                      </span>
                      {running.length ? (
                        <span aria-hidden className="flex w-full flex-col gap-0.5">
                          {running.slice(0, 3).map((rc) => (
                            <span key={rc.id} className="h-1 w-full rounded-full" style={{ background: rc.color }} />
                          ))}
                        </span>
                      ) : null}
                      {items
                        .slice(0, MAX_CHIPS)
                        .map((it) =>
                          it.kind === "idea" ? (
                            <IdeaChip key={it.key} chip={it} />
                          ) : (
                            <ChipBody key={it.key} chip={it} />
                          ),
                        )}
                      {items.length > MAX_CHIPS ? (
                        <span className="px-1.5 text-xs font-bold">+{items.length - MAX_CHIPS} more</span>
                      ) : null}
                    </DayCell>
                  );
                })}
              </div>
              <DragOverlay dropAnimation={null}>
                {dragIdea ? (
                  <span className="flex w-40 cursor-grabbing">
                    <ChipBody
                      dragging
                      chip={{
                        key: dragIdea.id,
                        text: dragIdea.text,
                        kind: "idea",
                        color: dragIdea.campaign_id ? campaignById.get(dragIdea.campaign_id)?.color : undefined,
                      }}
                    />
                  </span>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        <Card className="min-w-0 flex-[1_1_340px]" aria-labelledby="day-h">
          <div className="flex flex-col gap-1">
            <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Selected date
            </span>
            <h2 id="day-h" className="text-[22px] leading-snug font-extrabold">
              {selectedLabel}
            </h2>
            {campaignsOn(selected).length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {campaignsOn(selected).map((c) => (
                  <CampaignTag key={c.id} campaign={c} />
                ))}
              </div>
            ) : null}
          </div>

          {selPosts.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-[15px] font-extrabold">Planned posts</h3>
              {selPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/content/${p.id}`}
                  className="flex flex-col gap-1 rounded-md bg-navy-800 p-3 text-white no-underline"
                >
                  <span className="text-sm font-bold">{p.title}</span>
                  <span className="text-[13px] text-ice-100/70">
                    {statusMeta(p.status).label} · {p.platforms.map(platformLabel).join(", ")}
                    {p.campaign_id && campaignById.get(p.campaign_id)
                      ? ` · ${campaignById.get(p.campaign_id)!.name}`
                      : ""}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-extrabold">
              Ideas <span className="font-semibold text-muted-foreground">({selIdeas.length})</span>
            </h3>
            {selIdeas.length ? (
              <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <GripVertical aria-hidden className="size-3.5" />
                Drag an idea to another day, or pick a new date below.
              </p>
            ) : null}
            {selIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ideas for this date yet.</p>
            ) : null}
            {selIdeas.map((i) => (
              <div key={i.id} className="flex flex-col gap-2 rounded-md border-[1.5px] border-dashed border-input p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex flex-col gap-1.5">
                    <span className="text-sm leading-snug font-bold">{i.text}</span>
                    {i.campaign_id && campaignById.get(i.campaign_id) ? (
                      <CampaignTag campaign={campaignById.get(i.campaign_id)!} className="self-start" />
                    ) : null}
                  </span>
                  {i.created_by === me.id || me.role === "owner" ? (
                    <button
                      type="button"
                      onClick={() => removeIdea(i)}
                      disabled={pending}
                      aria-label={`Remove idea: ${i.text}${i.content_id ? " (its card stays on the board)" : ""}`}
                      title={i.content_id ? "Remove idea (the card stays on the board)" : "Remove idea"}
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-ice-100"
                    >
                      <XIcon className="size-4" strokeWidth={2.5} />
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    {i.platforms.length ? i.platforms.map(platformLabel).join(", ") : "No platform yet"}
                  </span>
                  {i.content_id ? (
                    <Link href={`/content/${i.content_id}`} className="text-[13px] font-bold text-blue-600">
                      {statusMeta(postsById.get(i.content_id)?.status ?? "todo").label} · Open card
                    </Link>
                  ) : null}
                </div>
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    moveIdea(i, moveDates[i.id] ?? "");
                  }}
                >
                  <Label htmlFor={`move-${i.id}`} className="sr-only">
                    Move this idea to
                  </Label>
                  <Input
                    id={`move-${i.id}`}
                    type="date"
                    className="h-9 min-w-0 flex-1"
                    value={moveDates[i.id] ?? i.idea_date}
                    onChange={(e) => setMoveDates((m) => ({ ...m, [i.id]: e.target.value }))}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={pending || !moveDates[i.id] || moveDates[i.id] === i.idea_date}
                  >
                    <CalendarClock strokeWidth={2.5} />
                    Move
                  </Button>
                </form>
              </div>
            ))}
          </div>

          {!canCreateContent(me) ? (
            <p className="border-t border-border pt-5 text-sm text-muted-foreground">
              Designers can&apos;t add post ideas. Ask a content manager to add one.
            </p>
          ) : (
            <form onSubmit={addIdea} className="flex flex-col gap-3 border-t border-border pt-5">
              <Label htmlFor="idea" className="text-[15px] font-extrabold">
                Add an idea for this date
              </Label>
              <Textarea
                id="idea"
                rows={3}
                maxLength={500}
                className="min-h-20"
                placeholder="For example: a carousel introducing the workshop speakers"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <ToggleGroup
                type="multiple"
                value={draftPlatforms}
                onValueChange={(v) => setDraftPlatforms(v as Platform[])}
                aria-label="Platforms for this idea"
              >
                {PLATFORMS.map((p) => (
                  <ToggleGroupItem key={p.id} value={p.id}>
                    {p.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {campaigns.length ? (
                <div className="flex flex-col gap-2">
                  <Label id="idea-campaign-label">Campaign</Label>
                  <Select value={draftCampaign} onValueChange={setDraftCampaign}>
                    <SelectTrigger aria-labelledby="idea-campaign-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CAMPAIGN}>No campaign</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span aria-hidden className="size-2.5 rounded-full" style={{ background: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <Button type="submit" disabled={pending || !draft.trim()}>
                <Plus strokeWidth={2.5} />
                Add idea
              </Button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
