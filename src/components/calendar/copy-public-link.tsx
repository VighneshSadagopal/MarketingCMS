"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Copies the public (no sign-in) calendar link for the month on screen. */
export function CopyPublicLink({ month }: { month: string }) {
  async function copy() {
    const url = `${window.location.origin}/public/calendar?month=${month}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public calendar link copied. Anyone with it can view titles and dates, without signing in.");
    } catch {
      window.prompt("Copy this public calendar link:", url);
    }
  }
  return (
    <Button type="button" variant="outline" onClick={copy}>
      <Link2 className="text-blue-600" strokeWidth={2.5} />
      Copy public link
    </Button>
  );
}
