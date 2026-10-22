import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCampaigns } from "@/lib/data";
import { campaignDateRange, campaignStatusLabel, type ContentStatus } from "@/lib/types";

export const metadata = { title: "Campaigns · DrupalAsia Marketing CMS" };

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  const supabase = await createClient();
  const { data: rows } = await supabase.from("content").select("campaign_id, status").not("campaign_id", "is", null);

  const stats = new Map<string, { total: number; done: number }>();
  for (const r of (rows ?? []) as { campaign_id: string; status: ContentStatus }[]) {
    const s = stats.get(r.campaign_id) ?? { total: 0, done: 0 };
    s.total += 1;
    if (r.status === "done") s.done += 1;
    stats.set(r.campaign_id, s);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            DrupalAsia Connect India 2027
          </span>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Campaigns</h1>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus strokeWidth={2.5} />
            New campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-white p-8">
          <h2 className="text-xl font-extrabold">No campaigns yet</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            A campaign groups a few posts around one goal, with a date range and shared hashtags and link.
          </p>
          <Button asChild>
            <Link href="/campaigns/new">Create your first campaign</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {campaigns.map((c) => {
            const s = stats.get(c.id) ?? { total: 0, done: 0 };
            const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-white text-navy-800 no-underline hover:border-input"
              >
                <span aria-hidden className="h-1.5 w-full" style={{ background: c.color }} />
                <div className="flex flex-col gap-4 px-5 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg leading-snug font-extrabold">{c.name}</h2>
                    <Badge variant="outline">{campaignStatusLabel(c.status)}</Badge>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <CalendarDays className="size-4 text-blue-600" strokeWidth={2.5} aria-hidden />
                    {campaignDateRange(c)}
                  </span>
                  {c.brief ? <p className="line-clamp-2 text-sm text-muted-foreground">{c.brief}</p> : null}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">Posted</span>
                      <span className="font-semibold">
                        {s.done} of {s.total} {s.total === 1 ? "post" : "posts"}
                      </span>
                    </div>
                    <div aria-hidden className="h-2 overflow-hidden rounded-full bg-ice-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
