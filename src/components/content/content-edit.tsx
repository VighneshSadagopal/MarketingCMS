import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ContentForm } from "@/components/content/content-form";
import { getCampaigns, getContent, getCurrentProfile, getTeam } from "@/lib/data";
import { contentPath, type ContentKind } from "@/lib/types";

/** Edit page for a post (/content/[id]/edit) or a blog (/blogs/[id]/edit). */
export async function ContentEdit({ id, kind }: { id: string; kind: ContentKind }) {
  const [me, team, item, campaigns] = await Promise.all([
    getCurrentProfile(),
    getTeam(),
    getContent(id),
    getCampaigns(),
  ]);
  if (!item) notFound();
  if (item.kind !== kind) redirect(`${contentPath(item)}/edit`);
  const isBlog = kind === "blog";

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <Link href={isBlog ? "/blogs" : "/board"} className="text-blue-600">
          {isBlog ? "Blogs" : "Board"}
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <Link href={contentPath(item)} className="text-blue-600">
          {item.title}
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          Edit
        </span>
      </nav>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">
        {isBlog ? "Edit blog" : "Edit content"}
      </h1>
      <ContentForm team={team} me={me} campaigns={campaigns} initial={item} />
    </div>
  );
}
