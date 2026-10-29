"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function CampaignActions({
  id,
  canDelete,
  canAddPost = true,
}: {
  id: string;
  canDelete: boolean;
  canAddPost?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      // Posts stay on the board; they just leave the campaign (on delete set null).
      const { error } = await createClient().from("campaigns").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Campaign deleted. Its posts are still on the board.");
      router.replace("/campaigns");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" asChild>
        <Link href={`/campaigns/${id}/edit`}>
          <Pencil className="text-blue-600" strokeWidth={2.5} />
          Edit
        </Link>
      </Button>
      {canAddPost ? (
        <Button asChild>
          <Link href={`/content/new?campaign=${id}`}>
            <Plus strokeWidth={2.5} />
            Add post
          </Link>
        </Button>
      ) : null}
      {canDelete ? (
        confirming ? (
          <span className="flex items-center gap-2">
            <Button variant="destructive" disabled={pending} onClick={remove}>
              Delete campaign
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </span>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Delete campaign" onClick={() => setConfirming(true)}>
            <Trash2 />
          </Button>
        )
      ) : null}
    </div>
  );
}
