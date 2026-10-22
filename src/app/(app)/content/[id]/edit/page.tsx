import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentForm } from "@/components/content/content-form";
import { getCampaigns, getContent, getCurrentProfile, getTeam } from "@/lib/data";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, team, item, campaigns] = await Promise.all([
    getCurrentProfile(),
    getTeam(),
    getContent(id),
    getCampaigns(),
  ]);
  if (!item) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <Link href="/board" className="text-blue-600">
          Board
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <Link href={`/content/${item.id}`} className="text-blue-600">
          {item.title}
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          Edit
        </span>
      </nav>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Edit content</h1>
      <ContentForm team={team} me={me} campaigns={campaigns} initial={item} />
    </div>
  );
}
