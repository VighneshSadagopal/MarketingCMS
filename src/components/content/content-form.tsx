"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ImagePlus, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient, publicImageUrl } from "@/lib/supabase/client";
import {
  MAX_IMAGES,
  PLATFORMS,
  X_WORD_LIMIT,
  campaignDateRange,
  type Campaign,
  type Content,
  type ContentStatus,
  type Platform,
  type Profile,
} from "@/lib/types";
import { countWords } from "@/lib/utils";

type ImageItem =
  | { kind: "stored"; path: string; url: string }
  | { kind: "new"; file: File; url: string; key: string };

const NONE = "none";

function toLocalParts(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function ContentForm({
  team,
  me,
  campaigns,
  initial,
  initialCampaignId,
}: {
  team: Profile[];
  me: Profile;
  campaigns: Campaign[];
  initial?: Content;
  initialCampaignId?: string;
}) {
  const router = useRouter();
  const editing = !!initial;
  const initialWhen = toLocalParts(initial?.publish_at ?? null);
  const startCampaign =
    initial?.campaign_id ?? (campaigns.some((c) => c.id === initialCampaignId) ? initialCampaignId! : NONE);
  const startCampaignRow = campaigns.find((c) => c.id === startCampaign);

  const [campaignId, setCampaignId] = useState<string>(startCampaign);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [brief, setBrief] = useState(initial?.brief ?? "");
  const [startStatus, setStartStatus] = useState<ContentStatus>("todo");
  const [platforms, setPlatforms] = useState<Platform[]>(initial?.platforms ?? ["linkedin", "x", "instagram"]);
  const [copy, setCopy] = useState<Record<Platform, string>>({
    linkedin: initial?.copy_linkedin ?? "",
    x: initial?.copy_x ?? "",
    instagram: initial?.copy_instagram ?? "",
  });
  const [hashtags, setHashtags] = useState(initial?.hashtags ?? startCampaignRow?.default_hashtags ?? "");
  const [link, setLink] = useState(initial?.link_url ?? startCampaignRow?.default_link ?? "");
  const [images, setImages] = useState<ImageItem[]>(
    (initial?.images ?? []).map((path) => ({ kind: "stored", path, url: publicImageUrl("content-images", path) }))
  );
  const [assignee, setAssignee] = useState(initial?.assignee_id ?? me.id);
  const [reviewer, setReviewer] = useState(
    initial?.reviewer_id ?? team.find((p) => p.role === "owner")?.id ?? NONE
  );
  const [date, setDate] = useState(initialWhen.date);
  const [time, setTime] = useState(initialWhen.time || "10:00");
  const [saving, setSaving] = useState(false);

  // Release object URLs for unsaved image previews.
  useEffect(() => {
    return () => {
      images.forEach((im) => im.kind === "new" && URL.revokeObjectURL(im.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campaign = campaigns.find((c) => c.id === campaignId);

  function pickCampaign(id: string) {
    setCampaignId(id);
    const next = campaigns.find((c) => c.id === id);
    if (!next) return;
    // Fill in the campaign's defaults only where the post has nothing yet.
    if (!hashtags.trim() && next.default_hashtags) setHashtags(next.default_hashtags);
    if (!link.trim() && next.default_link) setLink(next.default_link);
  }

  const xWords = countWords(copy.x);
  const xOver = xWords > X_WORD_LIMIT;
  const xOn = platforms.includes("x");
  const selected = useMemo(() => PLATFORMS.filter((p) => platforms.includes(p.id)), [platforms]);

  function togglePlatform(id: Platform, on: boolean) {
    setPlatforms((cur) => (on ? [...cur, id] : cur.filter((p) => p !== id)));
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length > room) toast.error(`You can add up to ${MAX_IMAGES} images.`);
    const next = list.slice(0, Math.max(room, 0)).map<ImageItem>((file) => ({
      kind: "new",
      file,
      url: URL.createObjectURL(file),
      key: crypto.randomUUID(),
    }));
    setImages((cur) => [...cur, ...next]);
  }

  function removeImage(index: number) {
    setImages((cur) => {
      const im = cur[index];
      if (im?.kind === "new") URL.revokeObjectURL(im.url);
      return cur.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Add a title.");
    if (platforms.length === 0) return toast.error("Pick at least one platform.");
    for (const p of selected) {
      if (!copy[p.id].trim()) return toast.error(`Write the ${p.label} copy.`);
    }
    if (xOn && xOver) return toast.error(`X copy is over ${X_WORD_LIMIT} words.`);
    if (campaign && date) {
      if ((campaign.start_date && date < campaign.start_date) || (campaign.end_date && date > campaign.end_date)) {
        return toast.error(`Pick a date within the campaign: ${campaignDateRange(campaign)}.`);
      }
    }

    setSaving(true);
    const supabase = createClient();
    const uploaded: string[] = [];
    try {
      const paths: string[] = [];
      for (const im of images) {
        if (im.kind === "stored") {
          paths.push(im.path);
          continue;
        }
        const ext = im.file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("content-images")
          .upload(path, im.file, { contentType: im.file.type, upsert: false });
        if (error) throw error;
        uploaded.push(path);
        paths.push(path);
      }

      const publishAt = date ? new Date(`${date}T${time || "10:00"}`).toISOString() : null;
      const row = {
        title: title.trim(),
        brief: brief.trim() || null,
        platforms,
        copy_linkedin: platforms.includes("linkedin") ? copy.linkedin.trim() : null,
        copy_x: platforms.includes("x") ? copy.x.trim() : null,
        copy_instagram: platforms.includes("instagram") ? copy.instagram.trim() : null,
        hashtags: hashtags.trim() || null,
        link_url: link.trim() || null,
        images: paths,
        assignee_id: assignee === NONE ? null : assignee,
        reviewer_id: reviewer === NONE ? null : reviewer,
        publish_at: publishAt,
        campaign_id: campaignId === NONE ? null : campaignId,
      };

      let id = initial?.id;
      if (editing && id) {
        const { error } = await supabase.from("content").update(row).eq("id", id);
        if (error) throw error;
        const removed = (initial?.images ?? []).filter((p) => !paths.includes(p));
        if (removed.length) await supabase.storage.from("content-images").remove(removed);
      } else {
        const { data, error } = await supabase
          .from("content")
          .insert({ ...row, status: startStatus, author_id: me.id })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
      }

      toast.success(editing ? "Content updated." : "Content created.");
      router.push(`/content/${id}`);
      router.refresh();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from("content-images").remove(uploaded);
      toast.error(err instanceof Error ? err.message : "Could not save content.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form onSubmit={onSubmit} className="flex min-w-0 flex-[999_1_560px] flex-col gap-6" noValidate>
        <Card>
          <fieldset className="flex flex-col gap-5">
            <legend className="mb-5 text-xl font-extrabold">Basics</legend>
            <div className="flex flex-col gap-2">
              <Label id="campaign-label">Campaign</Label>
              <Select value={campaignId} onValueChange={pickCampaign}>
                <SelectTrigger aria-labelledby="campaign-label" className="sm:w-96">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No campaign</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="size-2.5 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campaign ? (
                <span className="text-sm text-muted-foreground">{campaignDateRange(campaign)}</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                maxLength={200}
                placeholder="For example: AI Summit announcement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            {!editing ? (
              <div className="flex flex-col gap-2">
                <Label id="start-label">Start in</Label>
                <Select value={startStatus} onValueChange={(v) => setStartStatus(v as ContentStatus)}>
                  <SelectTrigger aria-labelledby="start-label" className="sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="brief">Brief</Label>
              <Textarea
                id="brief"
                rows={2}
                className="min-h-16"
                placeholder="What should this post achieve, and for whom?"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </div>
          </fieldset>
        </Card>

        <Card>
          <fieldset className="flex flex-col gap-5">
            <legend className="mb-5 text-xl font-extrabold">Platforms</legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
              {PLATFORMS.map((p) => {
                const on = platforms.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={
                      on
                        ? "flex cursor-pointer items-center gap-3 rounded-md border-2 border-blue-600 bg-ice-100 px-4 py-3.5"
                        : "flex cursor-pointer items-center gap-3 rounded-md border border-input bg-white px-4 py-3.5"
                    }
                  >
                    <Checkbox checked={on} onCheckedChange={(v) => togglePlatform(p.id, v === true)} />
                    <span className="text-[15px] font-bold">{p.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Card>

        <Card>
          <fieldset className="flex flex-col gap-5">
            <legend className="mb-5 text-xl font-extrabold">Post copy</legend>
            {selected.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pick a platform to write its copy.</p>
            ) : null}
            {selected.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor={`copy-${p.id}`}>{p.label} copy</Label>
                  {p.id === "x" ? (
                    <span
                      aria-live="polite"
                      className={xOver ? "text-sm font-bold text-navy-800" : "text-sm font-medium text-muted-foreground"}
                    >
                      {xWords} / {X_WORD_LIMIT} words
                    </span>
                  ) : null}
                </div>
                <Textarea
                  id={`copy-${p.id}`}
                  rows={4}
                  aria-invalid={p.id === "x" && xOver ? true : undefined}
                  placeholder={`Write the ${p.label} post`}
                  value={copy[p.id]}
                  onChange={(e) => setCopy((c) => ({ ...c, [p.id]: e.target.value }))}
                />
              </div>
            ))}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="hashtags">Hashtags</Label>
                <Input
                  id="hashtags"
                  placeholder="#Drupal #DrupalAsia"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="link">Link</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </div>
          </fieldset>
        </Card>

        <Card>
          <fieldset className="flex flex-col gap-5">
            <legend className="mb-5 text-xl font-extrabold">Images</legend>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Used on every selected platform. PNG, JPG or WebP, up to {MAX_IMAGES} images.
              </p>
              <span aria-live="polite" className="text-sm font-bold">
                {images.length} of {MAX_IMAGES}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {images.map((im, i) => (
                <div
                  key={im.kind === "stored" ? im.path : im.key}
                  className="relative aspect-square overflow-hidden rounded-md bg-navy-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={`Image ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white text-navy-800"
                  >
                    <XIcon className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES ? (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-input bg-ice-100 text-sm font-bold focus-within:outline-2 focus-within:outline-blue-600">
                  <ImagePlus className="size-6 text-blue-600" strokeWidth={2.5} aria-hidden />
                  Add image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : null}
            </div>
          </fieldset>
        </Card>

        <Card>
          <fieldset className="flex flex-col gap-5">
            <legend className="mb-5 text-xl font-extrabold">Team and timing</legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
              <div className="flex flex-col gap-2">
                <Label id="assignee-label">Assignee</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger aria-labelledby="assignee-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {team.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name ?? "Team member"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label id="reviewer-label">Reviewer</Label>
                <Select value={reviewer} onValueChange={setReviewer}>
                  <SelectTrigger aria-labelledby="reviewer-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No reviewer</SelectItem>
                    {team.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name ?? "Team member"}
                        {p.role === "owner" ? " (Owner)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">Target publish date</Label>
                <Input
                  id="date"
                  type="date"
                  min={campaign?.start_date ?? undefined}
                  max={campaign?.end_date ?? undefined}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
          </fieldset>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" asChild>
            <Link href={editing ? `/content/${initial?.id}` : "/"}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create content"}
          </Button>
        </div>
      </form>

      <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 lg:sticky lg:top-6">
        <Card aria-labelledby="xlimit-h">
          <h2 id="xlimit-h" className="text-xl font-extrabold">
            X word limit
          </h2>
          {xOn ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-bold">X copy</span>
                <span className="font-semibold">
                  {xWords} / {X_WORD_LIMIT} words
                </span>
              </div>
              <div aria-hidden className="h-2 overflow-hidden rounded-full bg-ice-100">
                <div
                  className={xOver ? "h-full rounded-full bg-orange-500" : "h-full rounded-full bg-blue-600"}
                  style={{ width: `${Math.min(100, Math.round((xWords / X_WORD_LIMIT) * 100))}%` }}
                />
              </div>
              {xOver ? (
                <span className="flex items-center gap-1.5 text-[13px] font-bold">
                  <AlertTriangle className="size-4 text-orange-500" strokeWidth={2.5} aria-hidden />
                  Over by {xWords - X_WORD_LIMIT} words
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select X to check the word limit.</p>
          )}
        </Card>
        <section className="night flex flex-col gap-3 rounded-2xl bg-navy-900 p-6 text-white">
          <h2 className="text-base font-extrabold">What happens next</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-ice-100/70">
            <li>The card appears on the board with your avatar.</li>
            <li>Move it to Ready for review when the copy and images are in.</li>
            <li>The owner approves it or suggests changes.</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
