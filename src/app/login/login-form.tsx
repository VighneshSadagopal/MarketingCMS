"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginForm({ error }: { error?: string }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (err) {
      setBusy(false);
      toast.error(err.message);
    }
    // On success the browser leaves for Google, so there's nothing more to do here.
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Sign in</h2>
        <p className="text-[15px] text-muted-foreground">
          Use the Google account the owner added to the team.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-navy-800"
        >
          {error}
        </p>
      ) : null}

      <Button type="button" variant="outline" size="lg" onClick={signIn} disabled={busy} className="h-12 gap-3">
        <GoogleMark />
        {busy ? "Opening Google…" : "Continue with Google"}
      </Button>

      <p className="text-sm text-muted-foreground">
        Not on the team yet? Ask the owner to add your Google email under Team access.
      </p>
    </div>
  );
}
