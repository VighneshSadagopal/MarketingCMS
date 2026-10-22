"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, PencilLine, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { ContentComment, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type Filter = "all" | "requests";

export function ActivityFeed({
  contentId,
  comments,
  team,
  me,
}: {
  contentId: string;
  comments: ContentComment[];
  team: Profile[];
  me: Profile;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();
  const byId = new Map(team.map((p) => [p.id, p]));

  const openRequests = comments.filter((c) => c.kind === "change_request" && !c.resolved).length;
  const shown = filter === "requests" ? comments.filter((c) => c.kind === "change_request") : comments;

  function post(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    startTransition(async () => {
      const { error } = await createClient()
        .from("content_comments")
        .insert({ content_id: contentId, author_id: me.id, kind: "comment", body });
      if (error) {
        toast.error(error.message);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  function setResolved(c: ContentComment, resolved: boolean) {
    startTransition(async () => {
      const { error } = await createClient()
        .from("content_comments")
        .update({
          resolved,
          resolved_by: resolved ? me.id : null,
          resolved_at: resolved ? new Date().toISOString() : null,
        })
        .eq("id", c.id);
      if (error) toast.error(error.message);
      else router.refresh();
    });
  }

  function remove(c: ContentComment) {
    startTransition(async () => {
      const { error } = await createClient().from("content_comments").delete().eq("id", c.id);
      if (error) toast.error(error.message);
      else router.refresh();
    });
  }

  return (
    <section
      id="activity"
      aria-labelledby="activity-h"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="activity-h" className="text-xl font-extrabold">
          Review and activity
        </h2>
        <div role="group" aria-label="Show" className="flex gap-1 rounded-md border border-border p-1">
          {(
            [
              ["all", "Everything"],
              ["requests", `Change requests${openRequests ? ` (${openRequests} open)` : ""}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={cn(
                "h-9 cursor-pointer rounded-[6px] px-3 text-sm font-bold",
                filter === id ? "bg-navy-800 text-white" : "text-navy-800 hover:bg-ice-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filter === "requests" ? "No change requests on this post." : "No comments yet. Start the conversation below."}
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {shown.map((c) => {
            const author = c.author_id ? byId.get(c.author_id) : undefined;
            const name = author?.full_name ?? "Someone";
            const canDelete = c.kind !== "status" && (c.author_id === me.id || me.role === "owner");

            if (c.kind === "status") {
              return (
                <li key={c.id} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ice-100">
                    <ArrowRightLeft className="size-4 text-blue-600" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span>
                    <strong className="font-bold text-navy-800">{name}</strong> {c.body}
                    <span> · {when.format(new Date(c.created_at))}</span>
                  </span>
                </li>
              );
            }

            const isRequest = c.kind === "change_request";
            const resolver = c.resolved_by ? byId.get(c.resolved_by) : undefined;
            return (
              <li key={c.id} className="flex gap-3">
                <UserAvatar profile={author ?? { id: c.author_id ?? c.id, full_name: name, avatar_url: null }} />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-sm">
                    <strong className="font-bold">{name}</strong>{" "}
                    {isRequest ? "suggested changes" : "commented"}
                    <span className="text-muted-foreground"> · {when.format(new Date(c.created_at))}</span>
                  </span>
                  <div
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                      isRequest
                        ? c.resolved
                          ? "border border-border bg-white text-muted-foreground"
                          : "border-l-4 border-orange-500 bg-orange-500/10"
                        : "bg-ice-100"
                    )}
                  >
                    {isRequest ? (
                      <span className="mb-1 flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase">
                        <PencilLine className="size-3.5 text-orange-500" strokeWidth={2.5} aria-hidden />
                        {c.resolved ? "Change request · resolved" : "Change request"}
                      </span>
                    ) : null}
                    {c.body}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isRequest ? (
                      c.resolved ? (
                        <>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Resolved{resolver ? ` by ${resolver.full_name ?? "a team member"}` : ""}
                          </span>
                          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setResolved(c, false)}>
                            <RotateCcw /> Reopen
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => setResolved(c, true)}>
                          <Check className="text-blue-600" strokeWidth={2.5} /> Mark resolved
                        </Button>
                      )
                    ) : null}
                    {canDelete ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => remove(c)}
                        aria-label={isRequest ? "Delete change request" : "Delete comment"}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <form onSubmit={post} className="flex flex-col gap-2 border-t border-border pt-4">
        <Label htmlFor="comment">Add a comment</Label>
        <Textarea
          id="comment"
          rows={3}
          maxLength={2000}
          className="min-h-20"
          placeholder="Ask a question or leave feedback"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" className="self-end" disabled={pending || !draft.trim()}>
          Comment
        </Button>
      </form>
    </section>
  );
}
