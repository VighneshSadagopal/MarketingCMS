import Link from "next/link";

import { KanbanBoard } from "@/components/board/kanban-board";
import { getAllContent, getCampaigns, getCommentCounts, getCurrentProfile, getTeam } from "@/lib/data";
import type { ContentKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Content board · DrupalAsia Marketing CMS" };

const VIEWS: { kind: ContentKind; label: string; href: string }[] = [
  { kind: "post", label: "Posts", href: "/board" },
  { kind: "blog", label: "Blogs", href: "/board?view=blogs" },
];

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const kind: ContentKind = view === "blogs" ? "blog" : "post";
  const [profile, team, content, campaigns, counts] = await Promise.all([
    getCurrentProfile(),
    getTeam(),
    getAllContent(kind),
    getCampaigns(),
    getCommentCounts(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            DrupalAsia Connect India 2027
          </span>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">
            {kind === "blog" ? "Blog board" : "Content board"}
          </h1>
        </div>
        {/* Posts and blogs have separate boards; this switches between them. */}
        <nav aria-label="Board" className="flex rounded-md border border-input bg-white p-1">
          {VIEWS.map((v) => (
            <Link
              key={v.kind}
              href={v.href}
              aria-current={v.kind === kind ? "page" : undefined}
              className={cn(
                "rounded-sm px-5 py-2 text-[15px] font-bold no-underline",
                v.kind === kind ? "bg-navy-800 text-white" : "text-navy-800 hover:bg-ice-100",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>
      </div>
      <KanbanBoard
        key={kind}
        kind={kind}
        initialItems={content}
        team={team}
        me={profile}
        campaigns={kind === "post" ? campaigns : []}
        counts={counts}
      />
    </>
  );
}
