import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getPublicCalendar, type PublicCampaign } from "@/lib/public-calendar";
import { platformLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Marketing calendar · DrupalAsia Connect India 2027",
  description: "Planned social posts for DrupalAsia Connect India 2027.",
  // Shared by link; keep it out of search engines.
  robots: { index: false, follow: false },
};

const TZ = "Asia/Kolkata";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

const isoInIst = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
const timeInIst = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);

/** Date arithmetic on plain YYYY-MM-DD strings (UTC maths, so the server's timezone doesn't matter). */
function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const pad = (n: number) => String(n).padStart(2, "0");
const monthParam = (y: number, m: number) => {
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};

function parseMonth(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    if (y >= 2020 && y <= 2100 && m >= 0 && m <= 11) return { y, m };
  }
  const [y, m] = isoInIst(new Date()).split("-").map(Number);
  return { y, m: m - 1 };
}

type Item = {
  key: string;
  kind: "post" | "idea";
  title: string;
  time?: string;
  platforms: string[];
  campaign?: PublicCampaign;
};

export default async function PublicCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const { y, m } = parseMonth(month);

  // Weeks start on Monday; show every week that touches the month.
  const firstIso = `${y}-${pad(m + 1)}-01`;
  const offset = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const gridStart = addDays(firstIso, -offset);
  const gridEnd = addDays(gridStart, cellCount - 1);
  const today = isoInIst(new Date());

  const { posts, ideas, campaigns } = await getPublicCalendar(gridStart, gridEnd);
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  // Bucket by day (IST). A post that came from an idea on the same day shows once, as the post.
  const byDay = new Map<string, Item[]>();
  const push = (day: string, item: Item) => byDay.set(day, [...(byDay.get(day) ?? []), item]);
  const postDay = new Map(posts.map((p) => [p.id, isoInIst(new Date(p.publish_at))]));
  for (const p of posts) {
    const d = new Date(p.publish_at);
    push(isoInIst(d), {
      key: `p-${p.id}`,
      kind: "post",
      title: p.title,
      time: timeInIst(d),
      platforms: p.platforms,
      campaign: p.campaign_id ? campaignById.get(p.campaign_id) : undefined,
    });
  }
  for (const i of ideas) {
    if (i.content_id && postDay.get(i.content_id) === i.idea_date) continue;
    push(i.idea_date, {
      key: `i-${i.id}`,
      kind: "idea",
      title: i.text,
      platforms: i.platforms,
      campaign: i.campaign_id ? campaignById.get(i.campaign_id) : undefined,
    });
  }

  const cells = Array.from({ length: cellCount }, (_, i) => addDays(gridStart, i));
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m, 1)),
  );
  const inMonth = (iso: string) => iso.startsWith(`${y}-${pad(m + 1)}`);
  const agenda = cells.filter((d) => inMonth(d) && byDay.get(d)?.length);
  const usedCampaigns = campaigns.filter((c) =>
    agenda.some((d) => byDay.get(d)!.some((it) => it.campaign?.id === c.id)),
  );
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );

  return (
    <div className="flex min-h-dvh flex-col bg-ice-100">
      <header className="night flex flex-wrap items-center justify-between gap-4 border-b border-white/25 bg-navy-900 px-4 py-3 text-white sm:px-8">
        <span className="flex items-center gap-3">
          <span aria-hidden className="h-7 w-1.5 rounded-full bg-orange-500" />
          <span className="flex flex-col">
            <span className="font-label text-xl leading-tight font-semibold">DrupalAsia</span>
            <span className="font-label text-[11px] font-semibold tracking-[0.12em] text-ice-100/70 uppercase">
              Marketing calendar
            </span>
          </span>
        </span>
        <Link href="/login" className="text-sm font-bold text-cyan-300">
          Team sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              DrupalAsia Connect India 2027
            </span>
            <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Social media calendar</h1>
            <p className="text-[15px] text-muted-foreground">
              Planned posts and ideas. Dates and times are India time (IST) and may change.
            </p>
          </div>
          <nav aria-label="Month" className="flex items-center gap-2">
            <Link
              href={`/public/calendar?month=${monthParam(y, m - 1)}`}
              aria-label="Previous month"
              className="flex size-10 items-center justify-center rounded-md border border-input bg-white text-navy-800"
            >
              <ChevronLeft strokeWidth={2.5} className="size-5" />
            </Link>
            <h2 aria-live="polite" className="min-w-44 text-center text-xl font-extrabold">
              {monthLabel}
            </h2>
            <Link
              href={`/public/calendar?month=${monthParam(y, m + 1)}`}
              aria-label="Next month"
              className="flex size-10 items-center justify-center rounded-md border border-input bg-white text-navy-800"
            >
              <ChevronRight strokeWidth={2.5} className="size-5" />
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-3.5 rounded-sm bg-navy-800" />
            Planned post
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-3.5 rounded-sm border-[1.5px] border-dashed border-input bg-white" />
            Idea
          </span>
          {usedCampaigns.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: c.color }} />
              {c.name}
            </span>
          ))}
        </div>

        {/* Month grid (wider screens). The list below has every item and is what phones see. */}
        <div aria-hidden className="hidden rounded-2xl border border-border bg-white p-3 md:block">
          <div className="grid grid-cols-7 gap-1.5 pb-1.5">
            {WEEKDAYS.map((d) => (
              <span key={d} className="px-2 text-[13px] font-bold text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((iso) => {
              const items = byDay.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  className={cn(
                    "flex min-h-28 min-w-0 flex-col gap-1 rounded-md border p-1.5",
                    inMonth(iso) ? "border-border bg-white" : "border-transparent bg-ice-100/60 text-muted-foreground",
                    iso === today && "border-blue-600 ring-1 ring-blue-600",
                  )}
                >
                  <span className={cn("px-1 text-[13px] font-bold", iso === today && "text-blue-600")}>
                    {Number(iso.slice(8))}
                  </span>
                  {items.slice(0, MAX_CHIPS).map((it) => (
                    <span
                      key={it.key}
                      title={it.title}
                      className={cn(
                        "flex min-w-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs leading-snug font-semibold",
                        it.kind === "post"
                          ? "border border-navy-800 bg-navy-800 text-white"
                          : "border-[1.5px] border-dashed border-input bg-white text-navy-800",
                      )}
                    >
                      {it.campaign ? (
                        <span
                          className="size-2 shrink-0 rounded-full shadow-[0_0_0_1px_#fff]"
                          style={{ background: it.campaign.color }}
                        />
                      ) : null}
                      <span className="truncate">{it.title}</span>
                    </span>
                  ))}
                  {items.length > MAX_CHIPS ? (
                    <span className="px-1 text-xs font-bold text-blue-600">+{items.length - MAX_CHIPS} more</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <section aria-labelledby="agenda-h" className="flex flex-col gap-4">
          <h2 id="agenda-h" className="text-xl font-extrabold">
            {monthLabel} by day
          </h2>
          {agenda.length === 0 ? (
            <p className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
              Nothing planned this month yet.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {agenda.map((iso) => (
                <li
                  key={iso}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:gap-6"
                >
                  <h3 className={cn("w-48 shrink-0 text-[15px] font-extrabold", iso === today && "text-blue-600")}>
                    {dayLabel(iso)}
                    {iso === today ? <span className="ml-2 text-[13px] font-bold">Today</span> : null}
                  </h3>
                  <ul className="flex min-w-0 flex-1 flex-col gap-2">
                    {byDay.get(iso)!.map((it) => (
                      <li key={it.key} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span
                          className={cn(
                            "shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-bold",
                            it.kind === "post"
                              ? "bg-navy-800 text-white"
                              : "border border-dashed border-input text-navy-800",
                          )}
                        >
                          {it.kind === "post" ? (it.time ?? "Post") : "Idea"}
                        </span>
                        <span className="min-w-0 font-bold [overflow-wrap:anywhere]">{it.title}</span>
                        <span className="text-[13px] font-semibold text-muted-foreground">
                          {[it.campaign?.name, it.platforms.map(platformLabel).join(", ")].filter(Boolean).join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
