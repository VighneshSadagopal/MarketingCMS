"use client";

import { useState, useTransition } from "react";
import { Copy, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateDailyUpdate } from "@/app/(app)/updates/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function UpdateGenerator({ today }: { today: string }) {
  const [day, setDay] = useState(today);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const r = await generateDailyUpdate(day);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setText(r.text);
      toast.success("Update generated. Review it, then copy it to Slack.");
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied. Paste it into Slack.");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="update-day">Update for</Label>
            <Input
              id="update-day"
              type="date"
              className="w-48"
              value={day}
              max={today}
              onChange={(e) => setDay(e.target.value || today)}
            />
          </div>
          <Button onClick={generate} disabled={pending}>
            {text ? <RefreshCw strokeWidth={2.5} /> : <Sparkles strokeWidth={2.5} />}
            {pending ? "Generating…" : text ? "Generate again" : "Generate update"}
          </Button>
          {text ? (
            <Button variant="outline" onClick={copy} disabled={pending}>
              <Copy strokeWidth={2.5} />
              Copy for Slack
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="update-text">Update</Label>
          <Textarea
            id="update-text"
            rows={22}
            className="min-h-96 font-mono text-[13px] leading-relaxed"
            placeholder="Press Generate update. You can edit the text before copying it."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <span className="text-[13px] text-muted-foreground">
            Written in Slack formatting: *bold*, _italic_ and links that show as post titles once pasted.
          </span>
        </div>
      </div>
    </Card>
  );
}
