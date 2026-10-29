"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { TEAM_ROLES, teamRoleLabel, type TeamMember, type TeamRole } from "@/lib/types";

const ROLE_HINT: Record<TeamRole, string> = {
  content_manager: "Creates posts and ideas, and can request graphics from designers.",
  designer: "Works on graphics they're asked for. Can't create posts or ideas.",
};

const added = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TeamAccess({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<TeamRole>("content_manager");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) return toast.error("Enter a valid email address.");
    if (members.some((m) => m.email === value)) return toast.error("That email is already on the list.");
    startTransition(async () => {
      const { error } = await createClient()
        .from("allowed_emails")
        .insert({ email: value, role: "member", team_role: newRole });
      if (error) {
        toast.error(error.message);
        return;
      }
      setEmail("");
      toast.success(`${value} can now sign in with Google as a ${teamRoleLabel(newRole).toLowerCase()}.`);
      router.refresh();
    });
  }

  function changeRole(value: string, role: TeamRole) {
    startTransition(async () => {
      const { error } = await createClient().rpc("set_team_role", {
        p_email: value,
        p_team_role: role,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${value} is now a ${teamRoleLabel(role).toLowerCase()}.`);
      router.refresh();
    });
  }

  function remove(value: string) {
    startTransition(async () => {
      const { error } = await createClient().rpc("remove_team_member", {
        p_email: value,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setConfirming(null);
      toast.success(`${value} was removed.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={add} className="flex flex-col gap-3">
          <Label htmlFor="new-email">Add a Google account</Label>
          <div className="flex flex-wrap gap-3">
            <Input
              id="new-email"
              type="email"
              autoComplete="off"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-[1_1_240px]"
            />
            <Select value={newRole} onValueChange={(v) => setNewRole(v as TeamRole)}>
              <SelectTrigger aria-label="Role" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={pending || !email.trim()}>
              <UserPlus strokeWidth={2.5} />
              Add to team
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {ROLE_HINT[newRole]} Their name and photo come from their Google account the first time they sign in.
          </p>
        </form>
      </Card>

      <section aria-labelledby="members-h" className="flex flex-col gap-3">
        <h2 id="members-h" className="text-xl font-extrabold">
          People who can sign in ({members.length})
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-white">
          {members.map((m) => (
            <li key={m.email} className="flex flex-wrap items-center gap-4 p-4">
              {m.user_id ? (
                <UserAvatar
                  profile={{
                    id: m.user_id,
                    full_name: m.full_name,
                    avatar_url: m.avatar_url,
                  }}
                  className="size-10"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-input text-sm font-bold text-muted-foreground"
                >
                  ?
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-bold">{m.full_name ?? m.email}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {m.full_name ? `${m.email} · ` : ""}
                  {m.joined ? "Signed in" : "Hasn't signed in yet"} · added {added.format(new Date(m.added_at))}
                </span>
              </div>
              {m.role === "owner" ? (
                <Badge variant="solid">Owner</Badge>
              ) : (
                <Select
                  value={m.team_role}
                  onValueChange={(v) => changeRole(m.email, v as TeamRole)}
                  disabled={pending}
                >
                  <SelectTrigger aria-label={`Role for ${m.email}`} className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {m.role !== "owner" ? (
                confirming === m.email ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Button variant="destructive" size="sm" disabled={pending} onClick={() => remove(m.email)}>
                      Remove access
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                      Keep
                    </Button>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${m.email}`}
                    onClick={() => setConfirming(m.email)}
                  >
                    <UserX /> Remove
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Content managers create posts and ideas and can request graphics. Designers make the graphics they&apos;re
          asked for and can&apos;t create posts. Removing someone deletes their login straight away; their posts, ideas
          and comments stay.
        </p>
      </section>
    </div>
  );
}
