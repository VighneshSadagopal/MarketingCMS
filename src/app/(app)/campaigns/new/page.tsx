import Link from "next/link";

import { CampaignForm } from "@/components/campaigns/campaign-form";
import { getCurrentProfile } from "@/lib/data";

export const metadata = { title: "New campaign · DrupalAsia Marketing CMS" };

export default async function NewCampaignPage() {
  const me = await getCurrentProfile();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold">
        <Link href="/campaigns" className="text-blue-600">
          Campaigns
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          New campaign
        </span>
      </nav>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">New campaign</h1>
      <CampaignForm me={me} />
    </div>
  );
}
