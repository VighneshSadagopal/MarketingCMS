import Link from "next/link";
import { redirect } from "next/navigation";

import { ContentForm } from "@/components/content/content-form";
import { getCurrentProfile, getTeam } from "@/lib/data";
import { canCreateContent } from "@/lib/types";

export const metadata = { title: "New blog · DrupalAsia Marketing CMS" };

export default async function NewBlogPage() {
  const [me, team] = await Promise.all([getCurrentProfile(), getTeam()]);
  if (!canCreateContent(me)) redirect("/blogs");
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold">
        <Link href="/blogs" className="text-blue-600">
          Blogs
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          New blog
        </span>
      </nav>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">New blog</h1>
        <p className="text-sm text-muted-foreground">
          Write the blog, add a cover image and pick who writes and reviews it. Blogs aren&apos;t part of any campaign.
        </p>
      </div>
      <ContentForm team={team} me={me} campaigns={[]} kind="blog" />
    </div>
  );
}
