"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteContent, updateContentStatus } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OWNER_ONLY_STATUSES, STATUSES, type ContentStatus } from "@/lib/types";

export function StatusActions({
  id,
  status,
  isOwner,
  canDelete,
}: {
  id: string;
  status: ContentStatus;
  isOwner: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function move(next: ContentStatus) {
    startTransition(async () => {
      const res = await updateContentStatus(id, next);
      if (res.ok) {
        toast.success(`Moved to ${STATUSES.find((s) => s.id === next)?.label}.`);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteContent(id);
      if (res.ok) {
        toast.success("Content deleted.");
        router.replace("/");
      } else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={status} onValueChange={(v) => move(v as ContentStatus)} disabled={pending}>
        <SelectTrigger className="w-52" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.id} value={s.id} disabled={!isOwner && OWNER_ONLY_STATUSES.includes(s.id)}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" asChild>
        <Link href={`/content/${id}/edit`}>
          <Pencil className="text-blue-600" strokeWidth={2.5} />
          Edit
        </Link>
      </Button>
      {status !== "changes_suggested" ? (
        <Button variant="outline" disabled={pending} onClick={() => move("changes_suggested")}>
          Suggest changes
        </Button>
      ) : null}
      {isOwner && status !== "ready_for_schedule" && status !== "done" ? (
        <Button disabled={pending} onClick={() => move("ready_for_schedule")}>
          <Check strokeWidth={2.5} />
          Approve for schedule
        </Button>
      ) : null}
      {canDelete ? (
        confirmDelete ? (
          <span className="flex items-center gap-2">
            <Button variant="destructive" disabled={pending} onClick={remove}>
              Confirm delete
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </span>
        ) : (
          <Button variant="ghost" aria-label="Delete content" size="icon" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
          </Button>
        )
      ) : null}
    </div>
  );
}
