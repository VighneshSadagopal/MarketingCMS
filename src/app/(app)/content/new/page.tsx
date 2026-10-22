import Link from "next/link";

import { ContentForm } from "@/components/content/content-form";
import { getCampaigns, getCurrentProfile, getTeam } from "@/lib/data";

export const metadata = { title: "New content · DrupalAsia Marketing CMS" };

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const [me, team, campaigns] = await Promise.all([getCurrentProfile(), getTeam(), getCampaigns()]);
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold">
        <Link href="/" className="text-blue-600">
          Board
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          New content
        </span>
      </nav>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">New content</h1>
        <p className="text-sm text-muted-foreground">
          Write the copy for each platform and add up to 4 images.
        </p>
      </div>
      <ContentForm team={team} me={me} campaigns={campaigns} initialCampaignId={campaign} />
    </div>
  );
}
