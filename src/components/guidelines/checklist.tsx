"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CHECKLIST } from "@/lib/guidelines";

/** The pre-publish checklist. Ticks are kept only while the page is open. */
export function PrePublishChecklist() {
  const [done, setDone] = useState<boolean[]>(() => CHECKLIST.map(() => false));
  const count = done.filter(Boolean).length;
  const all = count === CHECKLIST.length;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span aria-live="polite" className="flex items-center gap-2 text-[15px] font-bold">
          {all ? <CheckCircle2 className="size-5 text-blue-600" strokeWidth={2.5} aria-hidden /> : null}
          {all ? `All ${CHECKLIST.length} checked. Ready to schedule.` : `${count} of ${CHECKLIST.length} checked`}
        </span>
        <Button variant="outline" size="sm" onClick={() => setDone(CHECKLIST.map(() => false))} disabled={count === 0}>
          <RotateCcw /> Reset for next post
        </Button>
      </div>
      <div aria-hidden className="h-2 overflow-hidden rounded-full bg-ice-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${(count / CHECKLIST.length) * 100}%` }} />
      </div>
      <ul className="flex flex-col gap-1">
        {CHECKLIST.map((label, i) => (
          <li key={label}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 hover:bg-ice-100">
              <Checkbox
                className="mt-0.5"
                checked={done[i]}
                onCheckedChange={(v) => setDone((cur) => cur.map((d, j) => (j === i ? v === true : d)))}
              />
              <span className={done[i] ? "text-[15px] text-muted-foreground line-through" : "text-[15px]"}>{label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
