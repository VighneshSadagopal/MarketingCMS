import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignForm } from "@/components/campaigns/campaign-form";
import { getCampaign, getCurrentProfile } from "@/lib/data";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, campaign] = await Promise.all([getCurrentProfile(), getCampaign(id)]);
  if (!campaign) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <Link href="/campaigns" className="text-blue-600">
          Campaigns
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <Link href={`/campaigns/${campaign.id}`} className="text-blue-600">
          {campaign.name}
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <span aria-current="page" className="text-muted-foreground">
          Edit
        </span>
      </nav>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Edit campaign</h1>
      <CampaignForm me={me} initial={campaign} />
    </div>
  );
}
