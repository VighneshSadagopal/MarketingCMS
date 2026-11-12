"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, ImagePlus, PencilLine, RotateCcw, Trash2, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import { refreshShared } from "@/app/(app)/cache-actions";
import { LinkifiedText } from "@/components/linkified-text";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient, publicImageUrl } from "@/lib/supabase/client";
import { MAX_COMMENT_IMAGE_BYTES, MAX_COMMENT_IMAGES, type ContentComment, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type Filter = "all" | "requests";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type Attachment = { file: File; preview: string };

/** Images attached to a comment; each opens full size in a new tab. */
function CommentImages({ paths }: { paths: string[] }) {
  if (!paths.length) return null;
  return (
    <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
      {paths.map((p, i) => {
        const url = publicImageUrl("content-images", p);
        return (
          <a
            key={p}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-md border border-border bg-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Comment image ${i + 1} (opens full size)`}
              className="aspect-[4/3] w-full object-cover"
            />
          </a>
        );
      })}
    </div>
  );
}

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);
  // Keep the latest preview URLs so they can be freed when the component goes away.
  useEffect(() => {
    previews.current = attachments.map((a) => a.preview);
  }, [attachments]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();
  const byId = new Map(team.map((p) => [p.id, p]));

  const openRequests = comments.filter((c) => c.kind === "change_request" && !c.resolved).length;
  const shown = filter === "requests" ? comments.filter((c) => c.kind === "change_request") : comments;

  function addFiles(files: Iterable<File>) {
    const next = [...attachments];
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name || "That file"} isn't an image. Use PNG, JPG, WebP or GIF.`);
        continue;
      }
      if (file.size > MAX_COMMENT_IMAGE_BYTES) {
        toast.error(`${file.name || "That image"} is over 10 MB.`);
        continue;
      }
      if (next.length >= MAX_COMMENT_IMAGES) {
        toast.error(`A comment can have up to ${MAX_COMMENT_IMAGES} images.`);
        break;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setAttachments(next);
  }

  function removeAttachment(i: number) {
    URL.revokeObjectURL(attachments[i].preview);
    setAttachments(attachments.filter((_, k) => k !== i));
  }

  /** Screenshots pasted into the comment box are attached. */
  function onPaste(e: React.ClipboardEvent) {
    const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    e.preventDefault();
    addFiles(files);
  }

  function post(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body && attachments.length === 0) return;
    startTransition(async () => {
      const supabase = createClient();
      const paths: string[] = [];
      for (const a of attachments) {
        const ext = a.file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        const path = `comments/${contentId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("content-images")
          .upload(path, a.file, { contentType: a.file.type, upsert: false });
        if (error) {
          if (paths.length) await supabase.storage.from("content-images").remove(paths);
          toast.error(`Couldn't upload an image: ${error.message}`);
          return;
        }
        paths.push(path);
      }
      const { error } = await supabase
        .from("content_comments")
        .insert({ content_id: contentId, author_id: me.id, kind: "comment", body, images: paths });
      if (error) {
        if (paths.length) await supabase.storage.from("content-images").remove(paths);
        toast.error(error.message);
        return;
      }
      attachments.forEach((a) => URL.revokeObjectURL(a.preview));
      setAttachments([]);
      setDraft("");
      await refreshShared(["comment-counts"]);
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
      if (error) {
        toast.error(error.message);
        return;
      }
      await refreshShared(["comment-counts"]);
      router.refresh();
    });
  }

  function remove(c: ContentComment) {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("content_comments").delete().eq("id", c.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      // The comment's images go with it.
      if (c.images?.length) await supabase.storage.from("content-images").remove(c.images);
      await refreshShared(["comment-counts"]);
      router.refresh();
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
                filter === id ? "bg-navy-800 text-white" : "text-navy-800 hover:bg-ice-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filter === "requests"
            ? "No change requests on this post."
            : "No comments yet. Start the conversation below."}
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
                    <strong className="font-bold text-navy-800">{name}</strong> <LinkifiedText text={c.body} />
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
                    <strong className="font-bold">{name}</strong> {isRequest ? "suggested changes" : "commented"}
                    <span className="text-muted-foreground"> · {when.format(new Date(c.created_at))}</span>
                  </span>
                  <div
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                      isRequest
                        ? c.resolved
                          ? "border border-border bg-white text-muted-foreground"
                          : "border-l-4 border-orange-500 bg-orange-500/10"
                        : "bg-ice-100",
                    )}
                  >
                    {isRequest ? (
                      <span className="mb-1 flex items-center gap-1.5 text-xs font-extrabold tracking-wide uppercase">
                        <PencilLine className="size-3.5 text-orange-500" strokeWidth={2.5} aria-hidden />
                        {c.resolved ? "Change request · resolved" : "Change request"}
                      </span>
                    ) : null}
                    {c.body ? <LinkifiedText text={c.body} /> : null}
                    <CommentImages paths={c.images ?? []} />
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
          placeholder="Ask a question or leave feedback. Links become clickable; paste a screenshot to attach it."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={onPaste}
        />
        {attachments.length ? (
          <ul aria-label="Attached images" className="flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <li key={a.preview} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.preview}
                  alt={a.file.name || `Image ${i + 1}`}
                  className="size-20 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  aria-label={`Remove ${a.file.name || `image ${i + 1}`}`}
                  className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full bg-navy-800 text-white shadow"
                >
                  <XIcon className="size-3.5" strokeWidth={3} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              addFiles(e.target.files ?? []);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || attachments.length >= MAX_COMMENT_IMAGES}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus className="text-blue-600" strokeWidth={2.5} />
            Add images
            <span className="font-semibold text-muted-foreground">
              {attachments.length}/{MAX_COMMENT_IMAGES}
            </span>
          </Button>
          <Button type="submit" disabled={pending || (!draft.trim() && attachments.length === 0)}>
            {pending ? "Posting…" : "Comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
