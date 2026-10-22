"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UTM_CAMPAIGN, UTM_DESTINATIONS, UTM_MEDIUMS, UTM_SOURCES } from "@/lib/guidelines";

export function UtmBuilder() {
  const [dest, setDest] = useState(UTM_DESTINATIONS[0].url);
  const [source, setSource] = useState(UTM_SOURCES[0]);
  const [medium, setMedium] = useState(UTM_MEDIUMS[0]);
  const [content, setContent] = useState("ai_summit_story");

  const slug =
    content
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "your_post_name";
  const url = `${dest}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${UTM_CAMPAIGN}&utm_content=${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Tagged link copied.");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it instead.");
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-white p-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="flex flex-col gap-2">
          <Label id="utm-dest-label">Destination page</Label>
          <Select value={dest} onValueChange={setDest}>
            <SelectTrigger aria-labelledby="utm-dest-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UTM_DESTINATIONS.map((d) => (
                <SelectItem key={d.url} value={d.url}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label id="utm-source-label">Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger aria-labelledby="utm-source-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UTM_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label id="utm-medium-label">Medium</Label>
          <Select value={medium} onValueChange={setMedium}>
            <SelectTrigger aria-labelledby="utm-medium-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UTM_MEDIUMS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="utm-content">Content name</Label>
          <Input id="utm-content" value={content} onChange={(e) => setContent(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold">Your tagged link</span>
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-navy-900 p-4">
          <code className="min-w-0 flex-1 font-mono text-sm break-all text-cyan-300">{url}</code>
          <Button variant="secondary" size="sm" onClick={copy}>
            <Copy /> Copy
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Before relying on end-to-end attribution, confirm analytics respects privacy and that the ticketing provider can
        report referrals.
      </p>
    </div>
  );
}
