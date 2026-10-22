"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Inbox, Plus } from "lucide-react";

import { CampaignTag } from "@/components/campaigns/campaign-tag";
import { DeadlineLabel } from "@/components/content/deadline-label";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDeadline } from "@/lib/deadlines";
import { statusMeta, type Campaign, type Content, type ContentStatus, type Profile } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const STAGES: { label: string; statuses: ContentStatus[]; color: string }[] = [
  { label: "To do", statuses: ["todo"], color: "#7f8aa3" },
  { label: "In progress", statuses: ["in_progress", "changes_suggested", "ready_for_review"], color: "#0462d2" },
  { label: "Ready to post", statuses: ["ready_for_schedule"], color: "#38d9f5" },
  { label: "Completed", statuses: ["done"], color: "#031a4b" },
];

const when = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Tile({ label, value, tone }: { label: string; value: number | string; tone?: "bad" }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-white p-5">
      <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
      <span className={cn("text-4xl font-extrabold tabular-nums", tone === "bad" ? "text-destructive" : "text-navy-800")}>
        {value}
      </span>
    </div>
  );
}

function TaskRow({ item, campaign }: { item: Content; campaign?: Campaign }) {
  const meta = statusMeta(item.status);
  return (
    <li>
      <Link
        href={`/content/${item.id}`}
        className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4 text-navy-800 no-underline hover:border-input"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="font-bold">{item.title}</span>
          <Badge variant="outline">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: meta.dot, boxShadow: "inset 0 0 0 1px rgba(3,26,75,0.35)" }}
            />
            {meta.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          <span>{item.publish_at ? `Target ${when.format(new Date(item.publish_at))}` : "No target date"}</span>
          {campaign ? <CampaignTag campaign={campaign} /> : null}
        </div>
        <DeadlineLabel item={item} className="self-start" />
      </Link>
    </li>
  );
}

export function MyWork({
  me,
  viewing,
  team,
  assigned,
  toReview,
  campaigns,
}: {
  me: Profile;
  viewing: Profile;
  /** Filled only for the owner, who can switch between people. */
  team: Profile[];
  assigned: Content[];
  toReview: Content[];
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const now = useNow();
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const isSelf = viewing.id === me.id;
  const firstName = (viewing.full_name ?? "").split(" ")[0] || "there";

  const open = assigned.filter((c) => c.status !== "done");
  const completed = assigned.filter((c) => c.status === "done");
  const overdue = now === null ? null : open.filter((c) => getDeadline(c, now)?.tone === "overdue");
  const pct = assigned.length ? Math.round((completed.length / assigned.length) * 100) : 0;
  const stageCounts = STAGES.map((s) => ({ ...s, n: assigned.filter((c) => s.statuses.includes(c.status)).length }));
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.n));

  // Open work first by urgency: overdue, then due soon, then by target date.
  const rank = (c: Content) => {
    const d = now === null ? null : getDeadline(c, now);
    return d?.tone === "overdue" ? 0 : d ? 1 : 2;
  };
  const upNext = [...open].sort(
    (a, b) => rank(a) - rank(b) || (a.publish_at ?? "9").localeCompare(b.publish_at ?? "9")
  );
  const doneRecent = [...completed].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  let takeaway = `${open.length} open ${open.length === 1 ? "post" : "posts"} and ${completed.length} completed.`;
  if (overdue && overdue.length) takeaway += ` ${overdue.length} ${overdue.length === 1 ? "is" : "are"} past a deadline: start there.`;
  else if (overdue && open.length) takeaway += " Nothing is overdue.";

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <UserAvatar profile={viewing} className="size-14 text-lg" />
          <div className="flex flex-col gap-1">
            <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {isSelf ? "My work" : "Team member"}
            </span>
            <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">
              {isSelf ? `Hi ${firstName}` : (viewing.full_name ?? "Team member")}
            </h1>
            <p className="text-[15px] text-muted-foreground">{takeaway}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {team.length > 1 ? (
            <div className="flex items-center gap-2">
              <span id="person-label" className="text-sm font-bold">
                Show
              </span>
              <Select
                value={viewing.id}
                onValueChange={(id) => router.push(id === me.id ? "/" : `/?person=${id}`)}
              >
                <SelectTrigger className="w-56" aria-labelledby="person-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {team.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.id === me.id ? `${p.full_name ?? "Me"} (me)` : (p.full_name ?? "Team member")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/board">Open board</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        <Tile label="Assigned" value={assigned.length} />
        <Tile label="Open" value={open.length} />
        <Tile label="Completed" value={completed.length} />
        <Tile
          label="Overdue"
          value={overdue === null ? "–" : overdue.length}
          tone={overdue && overdue.length ? "bad" : undefined}
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="next-h"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="next-h" className="text-xl font-extrabold">
              Up next
            </h2>
            <span className="text-sm text-muted-foreground">Overdue first, then soonest target</span>
          </div>
          {upNext.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-white p-6">
              <span className="flex items-center gap-2 font-bold">
                <Inbox className="size-5 text-blue-600" aria-hidden /> Nothing open
              </span>
              <p className="text-sm text-muted-foreground">
                {isSelf ? "No posts are assigned to you right now." : "No open posts are assigned to them."}
              </p>
              {isSelf ? (
                <Button asChild size="sm">
                  <Link href="/content/new">
                    <Plus strokeWidth={2.5} /> New content
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {upNext.map((c) => (
                <TaskRow key={c.id} item={c} campaign={c.campaign_id ? campaignById.get(c.campaign_id) : undefined} />
              ))}
            </ul>
          )}

          {toReview.length ? (
            <>
              <h2 className="pt-4 text-xl font-extrabold">Waiting for {isSelf ? "your" : "their"} review</h2>
              <ul className="flex flex-col gap-3">
                {toReview.map((c) => (
                  <TaskRow key={c.id} item={c} campaign={c.campaign_id ? campaignById.get(c.campaign_id) : undefined} />
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <section aria-labelledby="progress-h" className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
            <h2 id="progress-h" className="text-xl font-extrabold">
              Progress
            </h2>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-extrabold tabular-nums">{pct}%</span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {completed.length} of {assigned.length} completed
                </span>
              </div>
              <div
                role="img"
                aria-label={`${pct}% completed`}
                className="h-3 overflow-hidden rounded-full bg-ice-100"
              >
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <dl className="flex flex-col gap-2.5">
              {stageCounts.map((s) => (
                <div key={s.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
                  <dt className="font-semibold">{s.label}</dt>
                  <div aria-hidden className="h-3 rounded-sm bg-ice-100">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${(s.n / maxStage) * 100}%`, background: s.color }}
                    />
                  </div>
                  <dd className="text-right font-bold tabular-nums">{s.n}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="done-h" className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-6">
            <h2 id="done-h" className="text-xl font-extrabold">
              Completed
            </h2>
            {doneRecent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing posted yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {doneRecent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/content/${c.id}`}
                      className="flex items-start gap-2 rounded-md p-2 text-sm font-semibold text-navy-800 no-underline hover:bg-ice-100"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600" strokeWidth={2.5} aria-hidden />
                      <span className="flex flex-col">
                        {c.title}
                        <span className="font-medium text-muted-foreground">
                          {c.publish_at ? `Posted ${when.format(new Date(c.publish_at))}` : "Posted"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
