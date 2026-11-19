"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { refreshShared } from "@/app/(app)/cache-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { utmSlug } from "@/lib/utm";
import { CAMPAIGN_COLORS, CAMPAIGN_STATUSES, type Campaign, type CampaignStatus, type Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CampaignForm({
  me,
  initial,
  usedUtm = [],
}: {
  me: Profile;
  initial?: Campaign;
  /** utm_campaign values this campaign's posts already use, most used first. */
  usedUtm?: { value: string; count: number }[];
}) {
  const router = useRouter();
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [brief, setBrief] = useState(initial?.brief ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [color, setColor] = useState<string>(initial?.color ?? CAMPAIGN_COLORS[0].value);
  const [hashtags, setHashtags] = useState(initial?.default_hashtags ?? "");
  const [link, setLink] = useState(initial?.default_link ?? "");
  const [utm, setUtm] = useState(initial?.utm_campaign ?? "");
  const suggestedUtm = name.trim() ? `dac27_${utmSlug(name)}`.slice(0, 100) : "";
  const [status, setStatus] = useState<CampaignStatus>(initial?.status ?? "planning");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the campaign a name.");
    if (startDate && endDate && endDate < startDate) return toast.error("The end date is before the start date.");
    const utmValue = utmSlug(utm);
    if (utm.trim() && !utmValue) return toast.error("Use letters, numbers and underscores for the UTM campaign.");

    setSaving(true);
    const supabase = createClient();
    const row = {
      name: name.trim(),
      brief: brief.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      color,
      default_hashtags: hashtags.trim() || null,
      default_link: link.trim() || null,
      utm_campaign: utmValue || null,
      status,
    };

    const res = editing
      ? await supabase.from("campaigns").update(row).eq("id", initial!.id).select("id").single()
      : await supabase
          .from("campaigns")
          .insert({ ...row, created_by: me.id })
          .select("id")
          .single();

    if (res.error) {
      setSaving(false);
      return toast.error(res.error.message);
    }
    await refreshShared(["campaigns"]);
    toast.success(editing ? "Campaign updated." : "Campaign created.");
    router.push(`/campaigns/${res.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <Card>
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-5 text-xl font-extrabold">Campaign</legend>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              maxLength={120}
              placeholder="For example: AI Summit launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="brief">Goal and brief</Label>
            <Textarea
              id="brief"
              rows={3}
              placeholder="What should this campaign achieve, and for whom?"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end">End date</Label>
              <Input
                id="end"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label id="status-label">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
                <SelectTrigger aria-labelledby="status-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_STATUSES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span id="color-label" className="text-sm font-bold">
              Colour
            </span>
            <div role="radiogroup" aria-labelledby="color-label" className="flex flex-wrap gap-2">
              {CAMPAIGN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={color === c.value}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "flex size-11 cursor-pointer items-center justify-center rounded-full border-2",
                    color === c.value ? "border-navy-800" : "border-transparent",
                  )}
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-full"
                    style={{ background: c.value }}
                  >
                    {color === c.value ? (
                      <Check className="size-4 text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]" strokeWidth={3} />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </fieldset>
      </Card>

      <Card>
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-2 text-xl font-extrabold">Defaults for posts</legend>
          <p className="text-sm text-muted-foreground">
            New posts in this campaign start with these. Each post can still change them.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tags">Hashtags</Label>
              <Input
                id="tags"
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="utm">UTM campaign</Label>
            <Input
              id="utm"
              maxLength={100}
              aria-describedby="utm-hint"
              placeholder={suggestedUtm || "dac27_speaker_promotion"}
              value={utm}
              onChange={(e) => setUtm(e.target.value)}
              onBlur={() => setUtm((v) => utmSlug(v))}
              className="font-mono"
            />
            <span id="utm-hint" className="text-[13px] text-muted-foreground">
              Saving a post in this campaign sets <code className="font-mono">utm_campaign</code> to this on its
              DrupalAsia links. Lowercase letters, numbers and underscores.
            </span>
            {(usedUtm.length || suggestedUtm) && !utm ? (
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-semibold text-muted-foreground">Use:</span>
                {usedUtm.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUtm(u.value)}
                    className="cursor-pointer rounded-full border border-input bg-white px-3 py-1 font-mono font-bold text-navy-800 hover:border-navy-800"
                  >
                    {u.value}{" "}
                    <span className="font-sans font-semibold text-muted-foreground">
                      · in {u.count} {u.count === 1 ? "link" : "links"}
                    </span>
                  </button>
                ))}
                {suggestedUtm && !usedUtm.some((u) => u.value === suggestedUtm) ? (
                  <button
                    type="button"
                    onClick={() => setUtm(suggestedUtm)}
                    className="cursor-pointer rounded-full border border-dashed border-input bg-white px-3 py-1 font-mono font-bold text-navy-800 hover:border-navy-800"
                  >
                    {suggestedUtm}
                  </button>
                ) : null}
              </div>
            ) : null}
            {usedUtm.length > 1 ? (
              <span className="text-[13px] font-semibold text-orange-500">
                This campaign&apos;s posts use {usedUtm.length} different UTM campaigns. Saving each post switches it to
                the one set here.
              </span>
            ) : null}
          </div>
        </fieldset>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" asChild>
          <Link href={editing ? `/campaigns/${initial!.id}` : "/campaigns"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}
