import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, PencilLine } from "lucide-react";

import { CampaignTag } from "@/components/campaigns/campaign-tag";
import { ActivityFeed } from "@/components/content/activity-feed";
import { DeadlineLabel } from "@/components/content/deadline-label";
import { SocialPreviews } from "@/components/content/social-previews";
import { StatusActions } from "@/components/content/status-actions";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { getCampaigns, getComments, getContent, getCurrentProfile, getTeam } from "@/lib/data";
import { publicImageUrl } from "@/lib/supabase/client";
import { platformLabel, statusMeta, type Profile } from "@/lib/types";

const when = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
  timeZoneName: "short",
});

function Person({ label, profile, suffix }: { label: string; profile?: Profile; suffix?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-[13px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="flex min-h-8 items-center gap-2 text-[15px] font-bold">
        {profile ? (
          <>
            <UserAvatar profile={profile} />
            {profile.full_name ?? "Team member"}
            {suffix ? <span className="font-medium text-muted-foreground">· {suffix}</span> : null}
          </>
        ) : (
          <span className="font-medium text-muted-foreground">Not set</span>
        )}
      </dd>
    </div>
  );
}

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ suggest?: string }>;
}) {
  const { id } = await params;
  const { suggest } = await searchParams;
  const [me, team, item, campaigns, comments] = await Promise.all([
    getCurrentProfile(),
    getTeam(),
    getContent(id),
    getCampaigns(),
    getComments(id),
  ]);
  if (!item) notFound();

  const byId = new Map(team.map((p) => [p.id, p]));
  const author = item.author_id ? byId.get(item.author_id) : undefined;
  const reviewer = item.reviewer_id ? byId.get(item.reviewer_id) : undefined;
  const assignee = item.assignee_id ? byId.get(item.assignee_id) : undefined;
  const meta = statusMeta(item.status);
  const imageUrls = item.images.map((p) => publicImageUrl("content-images", p));
  const isOwner = me.role === "owner";
  const campaign = item.campaign_id ? campaigns.find((c) => c.id === item.campaign_id) : undefined;
  const openRequests = comments.filter((c) => c.kind === "change_request" && !c.resolved);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold">
        <Link href="/board" className="text-blue-600">
          Board
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          {item.title}
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">{item.title}</h1>
            <Badge variant="outline" className="px-3 py-1 text-[13px]">
              <span
                aria-hidden
                className="size-2.5 rounded-full shadow-[inset_0_0_0_1.5px_rgba(3,26,75,0.35)]"
                style={{ background: meta.dot }}
              />
              {meta.label}
            </Badge>
          </div>
          {campaign ? (
            <Link href={`/campaigns/${campaign.id}`} className="self-start no-underline" aria-label={`Campaign: ${campaign.name}`}>
              <CampaignTag campaign={campaign} className="px-3 py-1 text-[13px] hover:border-input" />
            </Link>
          ) : null}
          <DeadlineLabel item={item} showDetail className="self-start" />
          {item.brief ? <p className="max-w-3xl text-sm text-muted-foreground">{item.brief}</p> : null}
          {openRequests.length ? (
            <a
              href="#activity"
              className="flex items-center gap-2 self-start rounded-md border-l-4 border-orange-500 bg-orange-500/10 px-3 py-2 text-sm font-bold text-navy-800 no-underline"
            >
              <PencilLine className="size-4 text-orange-500" strokeWidth={2.5} aria-hidden />
              {openRequests.length} open change {openRequests.length === 1 ? "request" : "requests"}: see review notes
            </a>
          ) : null}
        </div>
        <StatusActions
          id={item.id}
          status={item.status}
          openSuggest={suggest === "1"}
          isOwner={isOwner}
          canDelete={isOwner || item.author_id === me.id}
        />
      </div>

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 rounded-2xl border border-border bg-white px-6 py-5">
        <Person label="Author" profile={author} />
        <Person label="Assignee" profile={assignee} />
        <Person label="Reviewer" profile={reviewer} suffix={reviewer?.role === "owner" ? "Owner" : undefined} />
        <div className="flex flex-col gap-2">
          <dt className="text-[13px] font-semibold text-muted-foreground">Target publish</dt>
          <dd className="flex min-h-8 items-center gap-2 text-[15px] font-bold">
            <CalendarDays className="size-[18px] text-blue-600" strokeWidth={2.5} aria-hidden />
            {item.publish_at ? when.format(new Date(item.publish_at)) : "Not scheduled"}
          </dd>
        </div>
        <div className="flex flex-col gap-2">
          <dt className="text-[13px] font-semibold text-muted-foreground">Platforms</dt>
          <dd className="flex min-h-8 flex-wrap items-center gap-1.5">
            {item.platforms.map((p) => (
              <Badge key={p}>{platformLabel(p)}</Badge>
            ))}
          </dd>
        </div>
      </dl>

      <SocialPreviews item={item} imageUrls={imageUrls} />

      <ActivityFeed contentId={item.id} comments={comments} team={team} me={me} />
    </div>
  );
}
