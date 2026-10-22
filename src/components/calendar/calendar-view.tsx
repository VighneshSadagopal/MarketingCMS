"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createClient } from "@/lib/supabase/client";
import {
  PLATFORMS,
  platformLabel,
  statusMeta,
  type Content,
  type Platform,
  type PostIdea,
  type Profile,
} from "@/lib/types";
import { cn, toIsoDate } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function monthParam(y: number, m: number) {
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CalendarView({
  year,
  month,
  initialSelected,
  ideas,
  posts,
  me,
}: {
  year: number;
  month: number;
  initialSelected?: string;
  ideas: PostIdea[];
  posts: Content[];
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
        : firstIso
  );
  const [draft, setDraft] = useState("");
  const [draftPlatforms, setDraftPlatforms] = useState<Platform[]>(["linkedin"]);
  const [pending, startTransition] = useTransition();

  const ideasByDate = useMemo(() => {
    const map = new Map<string, PostIdea[]>();
    for (const i of ideas) map.set(i.idea_date, [...(map.get(i.idea_date) ?? []), i]);
    return map;
  }, [ideas]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Content[]>();
    for (const p of posts) {
      if (!p.publish_at) continue;
      const key = toIsoDate(new Date(p.publish_at));
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [posts]);

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

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const [sy, sm, sd] = selected.split("-").map(Number);
  const selectedLabel = new Date(sy, sm - 1, sd).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const selPosts = postsByDate.get(selected) ?? [];
  const selIdeas = ideasByDate.get(selected) ?? [];

  function addIdea(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    startTransition(async () => {
      const { error } = await createClient()
        .from("post_ideas")
        .insert({ idea_date: selected, text, platforms: draftPlatforms, created_by: me.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      setDraft("");
      toast.success("Idea added.");
      router.refresh();
    });
  }

  function removeIdea(id: string) {
    startTransition(async () => {
      const { error } = await createClient().from("post_ideas").delete().eq("id", id);
      if (error) toast.error(error.message);
      else router.refresh();
    });
  }

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
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((c) => {
                const items = [
                  ...(postsByDate.get(c.iso) ?? []).map((p) => ({ key: p.id, text: p.title, kind: "post" as const })),
                  ...(ideasByDate.get(c.iso) ?? []).map((i) => ({ key: i.id, text: i.text, kind: "idea" as const })),
                ];
                const isSel = c.iso === selected;
                const isToday = c.iso === todayIso;
                return (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => setSelected(c.iso)}
                    aria-pressed={isSel}
                    aria-label={`${c.date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}, ${items.length} items`}
                    className={cn(
                      "flex min-h-[116px] min-w-0 cursor-pointer flex-col gap-1 rounded-md p-2 text-left",
                      isSel ? "border-2 border-blue-600" : "border border-border hover:border-input",
                      c.inMonth ? "bg-white text-navy-800" : "bg-ice-100/60 text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-sm font-extrabold",
                        isToday && "bg-blue-600 text-white"
                      )}
                    >
                      {c.date.getDate()}
                    </span>
                    {items.slice(0, MAX_CHIPS).map((it) => (
                      <span
                        key={it.key}
                        className={cn(
                          "block w-full truncate rounded-sm px-1.5 py-0.5 text-xs leading-snug font-semibold",
                          it.kind === "post"
                            ? "border border-navy-800 bg-navy-800 text-white"
                            : "border-[1.5px] border-dashed border-input bg-white text-navy-800"
                        )}
                      >
                        {it.text}
                      </span>
                    ))}
                    {items.length > MAX_CHIPS ? (
                      <span className="px-1.5 text-xs font-bold">+{items.length - MAX_CHIPS} more</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
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
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="text-[15px] font-extrabold">
              Ideas <span className="font-semibold text-muted-foreground">({selIdeas.length})</span>
            </h3>
            {selIdeas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ideas for this date yet.</p>
            ) : null}
            {selIdeas.map((i) => (
              <div key={i.id} className="flex flex-col gap-2 rounded-md border-[1.5px] border-dashed border-input p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm leading-snug font-bold">{i.text}</span>
                  {i.created_by === me.id || me.role === "owner" ? (
                    <button
                      type="button"
                      onClick={() => removeIdea(i.id)}
                      disabled={pending}
                      aria-label={`Delete idea: ${i.text}`}
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
                  <Link href="/content/new" className="text-[13px] font-bold text-blue-600">
                    Turn into content
                  </Link>
                </div>
              </div>
            ))}
          </div>

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
            <Button type="submit" disabled={pending || !draft.trim()}>
              <Plus strokeWidth={2.5} />
              Add idea
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
