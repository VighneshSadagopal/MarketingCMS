"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Lightbulb, Plus } from "lucide-react";
import { toast } from "sonner";

import { DeadlineLabel } from "@/components/content/deadline-label";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { friendlyDbError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, readingMinutes, statusMeta, type Content, type ContentStatus, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const ALL = "all";
const IDEAS = "ideas";

/** A blog idea is a blog that hasn't been written yet. */
const isIdea = (b: Content) => !b.body?.trim();

export function BlogsView({
  blogs,
  team,
  me,
  canCreate,
}: {
  blogs: Content[];
  team: Profile[];
  me: Profile;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>(ALL);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const byId = useMemo(() => new Map(team.map((p) => [p.id, p])), [team]);

  const order = (s: ContentStatus) => STATUSES.findIndex((x) => x.id === s);
  const sorted = [...blogs].sort(
    (a, b) => order(a.status) - order(b.status) || b.updated_at.localeCompare(a.updated_at),
  );
  const shown = sorted.filter((b) => (filter === ALL ? true : filter === IDEAS ? isIdea(b) : b.status === filter));
  const ideaCount = blogs.filter(isIdea).length;

  function addIdea(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      // An idea is a blog card in Todo with a title and a note; the text is written later.
      const { error } = await createClient()
        .from("content")
        .insert({
          kind: "blog",
          title: t,
          brief: note.trim() || null,
          status: "todo",
          platforms: [],
          author_id: me.id,
          assignee_id: me.id,
          reviewer_id: team.find((p) => p.role === "owner")?.id ?? null,
        });
      if (error) {
        toast.error(friendlyDbError(error.message));
        return;
      }
      setTitle("");
      setNote("");
      toast.success("Blog idea added to Todo on the blog board.");
      router.refresh();
    });
  }

  const chips = [
    { id: ALL, label: "All", n: blogs.length },
    { id: IDEAS, label: "Ideas (not written yet)", n: ideaCount },
    ...STATUSES.map((s) => ({ id: s.id as string, label: s.label, n: blogs.filter((b) => b.status === s.id).length })),
  ];

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="blogs-h" className="flex min-w-0 flex-[999_1_620px] flex-col gap-4">
        <h2 id="blogs-h" className="sr-only">
          All blogs
        </h2>
        <div role="group" aria-label="Filter blogs" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-bold",
                filter === c.id
                  ? "border-navy-800 bg-navy-800 text-white"
                  : "border-input bg-white hover:border-navy-800",
              )}
            >
              {c.label} <span className={filter === c.id ? "text-ice-100/70" : "text-muted-foreground"}>{c.n}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-white p-6">
            <span className="font-bold">{blogs.length ? "No blogs match this filter." : "No blogs yet."}</span>
            <p className="text-sm text-muted-foreground">
              {canCreate ? "Add a blog idea, or start writing with New blog." : "Content managers add blogs and ideas."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((b) => {
              const meta = statusMeta(b.status);
              const assignee = b.assignee_id ? byId.get(b.assignee_id) : undefined;
              const { words, minutes } = readingMinutes(b.body);
              return (
                <li key={b.id}>
                  <Link
                    href={`/blogs/${b.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4 text-navy-800 no-underline hover:border-input"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="flex items-center gap-2 font-bold">
                        {isIdea(b) ? (
                          <Lightbulb className="size-4 shrink-0 text-orange-500" strokeWidth={2.5} aria-label="Idea" />
                        ) : null}
                        {b.title}
                      </span>
                      <Badge variant="outline">
                        <span
                          aria-hidden
                          className="size-2 rounded-full"
                          style={{ background: meta.dot, boxShadow: "inset 0 0 0 1px rgba(3,26,75,0.35)" }}
                        />
                        {meta.label}
                      </Badge>
                    </div>
                    {b.brief ? <p className="line-clamp-2 text-sm text-muted-foreground">{b.brief}</p> : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-semibold text-muted-foreground">
                      <span>{words ? `${words} words · ${minutes} min read` : "Idea, not written yet"}</span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5 text-blue-600" strokeWidth={2.5} aria-hidden />
                        {b.publish_at ? `Target ${when.format(new Date(b.publish_at))}` : "No target date"}
                      </span>
                      {assignee ? (
                        <span className="flex items-center gap-1.5">
                          <UserAvatar profile={assignee} className="size-6 text-[10px]" />
                          {assignee.full_name ?? "Team member"}
                        </span>
                      ) : null}
                      <DeadlineLabel item={b} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 lg:sticky lg:top-6">
        {canCreate ? (
          <Card>
            <form onSubmit={addIdea} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <Lightbulb className="size-5 text-orange-500" strokeWidth={2.5} aria-hidden />
                Add a blog idea
              </h2>
              <p className="text-sm text-muted-foreground">
                It goes into Todo on the blog board, assigned to you. Write it later.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-title">Working title</Label>
                <Input
                  id="idea-title"
                  maxLength={200}
                  placeholder="For example: Why we chose IIT Bombay for DrupalAsia Connect"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea-note">Idea notes</Label>
                <Textarea
                  id="idea-note"
                  rows={4}
                  className="min-h-24"
                  placeholder="The angle, who it's for, sources or people to talk to"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={pending || !title.trim()}>
                <Plus strokeWidth={2.5} />
                Add idea
              </Button>
            </form>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">
              Designers can&apos;t add blogs or ideas. Ask a content manager.
            </p>
          </Card>
        )}
      </aside>
    </div>
  );
}
