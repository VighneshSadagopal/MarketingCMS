import Link from "next/link";
import { Plus } from "lucide-react";

import { BlogsView } from "@/components/blogs/blogs-view";
import { Button } from "@/components/ui/button";
import { getAllContent, getCurrentProfile, getTeam } from "@/lib/data";
import { canCreateContent } from "@/lib/types";

export const metadata = { title: "Blogs · DrupalAsia Marketing CMS" };

export default async function BlogsPage() {
  const [me, team, blogs] = await Promise.all([getCurrentProfile(), getTeam(), getAllContent("blog")]);
  const canCreate = canCreateContent(me);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            DrupalAsia Connect India 2027
          </span>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Blogs</h1>
          <p className="text-[15px] text-muted-foreground">
            Blog ideas and articles. They follow the same review steps as posts, but stay out of campaigns and the
            social calendar.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/board?view=blogs">Open blog board</Link>
          </Button>
          {canCreate ? (
            <Button asChild>
              <Link href="/blogs/new">
                <Plus strokeWidth={2.5} />
                New blog
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <BlogsView blogs={blogs} team={team} me={me} canCreate={canCreate} />
    </div>
  );
}
