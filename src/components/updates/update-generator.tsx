"use client";

import { useRef, useState, useTransition } from "react";
import { Copy, FileText, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateDailyUpdate } from "@/app/(app)/updates/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UpdateGenerator({ today }: { today: string }) {
  const [day, setDay] = useState(today);
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  function generate() {
    startTransition(async () => {
      const r = await generateDailyUpdate(day);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setHtml(r.html);
      setText(r.text);
      setEdited(false);
      toast.success("Update generated. Review it, then copy it to Slack.");
    });
  }

  /** Copies formatted text (Slack keeps bold, links and lists when pasted), with plain text as fallback. */
  async function copyFormatted() {
    const el = box.current;
    if (!el) return;
    const plain = edited ? el.innerText : text;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([el.innerHTML], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      toast.success("Copied. Paste it into Slack.");
    } catch {
      toast.error("Couldn't copy. Select the update and copy it instead.");
    }
  }

  async function copyMarkup() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied as Slack markup text.");
    } catch {
      toast.error("Couldn't copy.");
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
            {html ? <RefreshCw strokeWidth={2.5} /> : <Sparkles strokeWidth={2.5} />}
            {pending ? "Generating…" : html ? "Generate again" : "Generate update"}
          </Button>
          {html ? (
            <>
              <Button variant="outline" onClick={copyFormatted} disabled={pending}>
                <Copy strokeWidth={2.5} />
                Copy for Slack
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyMarkup}
                disabled={pending || edited}
                title={edited ? "Not available after editing; use Copy for Slack" : undefined}
              >
                <FileText strokeWidth={2.5} />
                Copy as plain text
              </Button>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span id="update-label" className="text-sm font-bold">
            Update
          </span>
          {html ? (
            <div
              ref={box}
              role="textbox"
              aria-multiline="true"
              aria-labelledby="update-label"
              contentEditable
              suppressContentEditableWarning
              onInput={() => setEdited(true)}
              className="update-doc min-h-96 rounded-md border border-input bg-white px-5 py-4 text-[15px] leading-relaxed text-navy-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-input bg-white px-5 py-4 text-sm text-muted-foreground">
              Press Generate update. You can edit the text before copying it.
            </div>
          )}
          <span className="text-[13px] text-muted-foreground">
            Copy for Slack keeps the bold headings, clickable post titles and lists when pasted. Copy as plain text
            gives Slack markup instead.
          </span>
        </div>
      </div>
    </Card>
  );
}
