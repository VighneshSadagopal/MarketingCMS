"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, PencilLine, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteContent, updateContentStatus } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { OWNER_ONLY_STATUSES, STATUSES, type ContentStatus } from "@/lib/types";

export function StatusActions({
  id,
  status,
  isOwner,
  canDelete,
  openSuggest = false,
}: {
  id: string;
  status: ContentStatus;
  isOwner: boolean;
  canDelete: boolean;
  /** Open the note box straight away (a card was dropped on Changes suggested). */
  openSuggest?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggesting, setSuggesting] = useState(openSuggest);
  const [note, setNote] = useState("");

  function move(next: ContentStatus) {
    if (next === "changes_suggested") {
      setSuggesting(true);
      return;
    }
    startTransition(async () => {
      const res = await updateContentStatus(id, next);
      if (res.ok) {
        toast.success(`Moved to ${STATUSES.find((s) => s.id === next)?.label}.`);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function suggest(e: React.FormEvent) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    startTransition(async () => {
      // Saves the note as a change request and moves the card to Changes suggested together.
      const { error } = await createClient().rpc("suggest_changes", { p_content_id: id, p_note: text });
      if (error) {
        toast.error(friendlyDbError(error.message));
        return;
      }
      setNote("");
      setSuggesting(false);
      toast.success("Change request sent.");
      router.replace(`/content/${id}#activity`);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteContent(id);
      if (res.ok) {
        toast.success("Content deleted.");
        router.replace("/board");
      } else toast.error(res.error);
    });
  }

  return (
    <div className="flex w-full flex-col items-end gap-3 sm:w-auto">
      <div className="flex flex-wrap items-center justify-end gap-3">
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
        <Button variant="outline" disabled={pending} onClick={() => setSuggesting((v) => !v)} aria-expanded={suggesting}>
          <PencilLine className="text-orange-500" strokeWidth={2.5} />
          Suggest changes
        </Button>
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

      {suggesting ? (
        <form
          onSubmit={suggest}
          className="flex w-full max-w-xl flex-col gap-2 rounded-xl border-l-4 border-orange-500 bg-white p-4 shadow-sm"
        >
          <Label htmlFor="suggest-note">What should change?</Label>
          <p className="text-[13px] text-muted-foreground">
            The author sees this note on the post and the card moves to Changes suggested.
          </p>
          <Textarea
            id="suggest-note"
            autoFocus
            rows={3}
            maxLength={2000}
            className="min-h-20"
            placeholder="For example: lead with the AI Summit, and shorten the X copy"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSuggesting(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !note.trim()}>
              Send change request
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
