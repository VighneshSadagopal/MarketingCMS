"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

/** For the designer on a graphic request: upload the graphic, then mark it delivered. */
export function GraphicActions({ id, hasImages }: { id: string; hasImages: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function deliver() {
    startTransition(async () => {
      const { error } = await createClient().from("content").update({ graphic_status: "delivered" }).eq("id", id);
      if (error) {
        toast.error(friendlyDbError(error.message));
        return;
      }
      toast.success("Graphic marked as delivered.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/content/${id}/edit#graphic`}>
          <ImagePlus className="text-blue-600" strokeWidth={2.5} />
          {hasImages ? "Update images" : "Upload graphic"}
        </Link>
      </Button>
      <Button
        size="sm"
        onClick={deliver}
        disabled={pending || !hasImages}
        title={hasImages ? undefined : "Upload the graphic first"}
      >
        <CheckCircle2 strokeWidth={2.5} />
        Mark graphic delivered
      </Button>
    </div>
  );
}
