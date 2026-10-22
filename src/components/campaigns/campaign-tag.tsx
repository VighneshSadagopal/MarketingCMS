import type { Campaign } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Campaign name with its colour as a dot. The colour never sits behind text. */
export function CampaignTag({
  campaign,
  className,
}: {
  campaign: Pick<Campaign, "name" | "color">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-white px-2 py-0.5 text-xs font-bold text-navy-800",
        className
      )}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: campaign.color }} />
      <span className="truncate">{campaign.name}</span>
    </span>
  );
}
