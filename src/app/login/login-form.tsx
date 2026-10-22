"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          toast.success("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Sign-in link sent. Check your inbox.");
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[400px] flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>
        <p className="text-[15px] text-muted-foreground">
          {mode === "signin"
            ? "Use the email your team owner invited."
            : "The first account becomes the owner. Everyone after joins as a member."}
        </p>
      </div>

      {mode === "signup" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" disabled={busy}>
        {mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      {mode === "signin" ? (
        <>
          <div aria-hidden className="flex items-center gap-3 text-[13px] font-semibold text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" size="lg" onClick={sendMagicLink} disabled={busy}>
            <Mail className="text-blue-600" strokeWidth={2.5} />
            Email me a sign-in link
          </Button>
        </>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {mode === "signin" ? "New to the team? " : "Already have an account? "}
        <button
          type="button"
          className="cursor-pointer font-bold text-blue-600 underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
