import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarX2, Hash, Link2 } from "lucide-react";

import { CampaignActions } from "@/components/campaigns/campaign-actions";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { getCampaign, getCampaignContent, getCurrentProfile, getTeam } from "@/lib/data";
import {
  STATUSES,
  campaignDateRange,
  campaignStatusLabel,
  platformLabel,
  statusMeta,
  type Content,
} from "@/lib/types";
import { toIsoDate } from "@/lib/utils";

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const gapFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

const GAP_DAYS = 7;

function parseDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// yyyy-mm-dd in India time, whatever timezone the server runs in.
const istDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/** Runs of GAP_DAYS or more days with nothing scheduled, inside the campaign dates. */
function findGaps(posts: Content[], start: string | null, end: string | null) {
  if (!start || !end) return [];
  const busy = new Set(posts.filter((p) => p.publish_at).map((p) => istDate.format(new Date(p.publish_at!))));
  const gaps: { from: Date; to: Date }[] = [];
  let runStart: Date | null = null;
  let runLength = 0;
  const last = parseDate(end);

  for (let d = parseDate(start); d <= last; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    if (busy.has(toIsoDate(d))) {
      if (runStart && runLength >= GAP_DAYS) gaps.push({ from: runStart, to: new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1) });
      runStart = null;
      runLength = 0;
    } else {
      runStart ??= d;
      runLength += 1;
    }
  }
  if (runStart && runLength >= GAP_DAYS) gaps.push({ from: runStart, to: last });
  return gaps;
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, team, campaign, posts] = await Promise.all([
    getCurrentProfile(),
    getTeam(),
    getCampaign(id),
    getCampaignContent(id),
  ]);
  if (!campaign) notFound();

  const byId = new Map(team.map((p) => [p.id, p]));
  const scheduled = posts.filter((p) => p.publish_at);
  const unscheduled = posts.filter((p) => !p.publish_at);
  const done = posts.filter((p) => p.status === "done").length;
  const pct = posts.length ? Math.round((done / posts.length) * 100) : 0;
  const gaps = findGaps(posts, campaign.start_date, campaign.end_date);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold">
        <Link href="/campaigns" className="text-blue-600">
          Campaigns
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          {campaign.name}
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden className="size-4 rounded-full" style={{ background: campaign.color }} />
            <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">{campaign.name}</h1>
            <Badge variant="outline" className="px-3 py-1 text-[13px]">
              {campaignStatusLabel(campaign.status)}
            </Badge>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <CalendarDays className="size-4 text-blue-600" strokeWidth={2.5} aria-hidden />
            {campaignDateRange(campaign)}
          </span>
          {campaign.brief ? <p className="max-w-3xl text-[15px] leading-relaxed">{campaign.brief}</p> : null}
        </div>
        <CampaignActions id={campaign.id} canDelete={me.role === "owner" || campaign.created_by === me.id} />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="timeline-h"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 rounded-2xl border border-border bg-white p-6"
        >
          <h2 id="timeline-h" className="text-xl font-extrabold">
            Timeline
          </h2>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts in this campaign yet. Use Add post, or pick this campaign when you add an idea on the calendar.
            </p>
          ) : null}

          {gaps.length ? (
            <ul className="flex flex-col gap-2">
              {gaps.map((g) => (
                <li
                  key={g.from.toISOString()}
                  className="flex items-center gap-2 rounded-md bg-orange-500/10 px-3 py-2 text-sm font-semibold"
                >
                  <CalendarX2 className="size-4 shrink-0 text-orange-500" strokeWidth={2.5} aria-hidden />
                  Nothing planned {gapFmt.format(g.from)} - {gapFmt.format(g.to)}
                </li>
              ))}
            </ul>
          ) : null}

          <ol className="flex flex-col">
            {scheduled.map((p, i) => {
              const d = new Date(p.publish_at!);
              const meta = statusMeta(p.status);
              const assignee = p.assignee_id ? byId.get(p.assignee_id) : undefined;
              return (
                <li key={p.id} className="relative flex gap-4 pb-5 pl-6">
                  {i < scheduled.length - 1 ? (
                    <span aria-hidden className="absolute top-3 bottom-0 left-[5px] w-0.5 bg-border" />
                  ) : null}
                  <span
                    aria-hidden
                    className="absolute top-1.5 left-0 size-3 rounded-full border-2 border-white"
                    style={{ background: campaign.color, boxShadow: "0 0 0 1.5px rgba(3,26,75,0.35)" }}
                  />
                  <div className="w-28 shrink-0 text-sm">
                    <span className="block font-bold">{dayFmt.format(d)}</span>
                    <span className="block text-muted-foreground">{timeFmt.format(d)}</span>
                  </div>
                  <Link
                    href={`/content/${p.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-border p-3 text-navy-800 no-underline hover:border-input"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">{p.title}</span>
                      <Badge variant="outline">
                        <span aria-hidden className="size-2 rounded-full" style={{ background: meta.dot, boxShadow: "inset 0 0 0 1px rgba(3,26,75,0.35)" }} />
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {p.platforms.map((pl) => (
                          <Badge key={pl}>{platformLabel(pl)}</Badge>
                        ))}
                      </div>
                      {assignee ? <UserAvatar profile={assignee} className="size-7 text-[11px]" /> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>

          {unscheduled.length ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-[15px] font-extrabold">Not scheduled yet</h3>
              {unscheduled.map((p) => (
                <Link
                  key={p.id}
                  href={`/content/${p.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm font-bold text-navy-800 no-underline hover:border-input"
                >
                  {p.title}
                  <span className="font-semibold text-muted-foreground">{statusMeta(p.status).label}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <section aria-labelledby="progress-h" className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
            <h2 id="progress-h" className="text-xl font-extrabold">
              Progress
            </h2>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-bold">Posted</span>
                <span className="font-semibold">
                  {done} of {posts.length}
                </span>
              </div>
              <div aria-hidden className="h-2 overflow-hidden rounded-full bg-ice-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <dl className="flex flex-col gap-2">
              {STATUSES.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <dt className="flex items-center gap-2 font-semibold">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ background: s.dot, boxShadow: "inset 0 0 0 1.5px rgba(3,26,75,0.35)" }}
                    />
                    {s.label}
                  </dt>
                  <dd className="font-bold">{posts.filter((p) => p.status === s.id).length}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="defaults-h" className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-6">
            <h2 id="defaults-h" className="text-xl font-extrabold">
              Post defaults
            </h2>
            <p className="flex items-start gap-2 text-sm">
              <Hash className="mt-0.5 size-4 shrink-0 text-blue-600" strokeWidth={2.5} aria-hidden />
              <span>{campaign.default_hashtags || <span className="text-muted-foreground">No hashtags</span>}</span>
            </p>
            <p className="flex items-start gap-2 text-sm break-all">
              <Link2 className="mt-0.5 size-4 shrink-0 text-blue-600" strokeWidth={2.5} aria-hidden />
              <span>{campaign.default_link || <span className="text-muted-foreground">No link</span>}</span>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
