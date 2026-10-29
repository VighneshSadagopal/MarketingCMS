"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient, publicImageUrl } from "@/lib/supabase/client";
import { roleLabel, type Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [busy, setBusy] = useState(false);

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Avatar must be 2 MB or smaller.");
    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const url = publicImageUrl("avatars", path);
    const { error: upErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    setBusy(false);
    if (upErr) return toast.error(upErr.message);
    setAvatarUrl(url);
    toast.success("Avatar updated.");
    router.refresh();
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient()
      .from("profiles")
      .update({ full_name: name.trim() || null })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Name saved.");
    router.refresh();
  }

  return (
    <Card>
      <div className="flex items-center gap-4">
        <UserAvatar profile={{ ...profile, full_name: name, avatar_url: avatarUrl }} className="size-20 text-xl" />
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Role: {roleLabel(profile)}</span>
          <Button variant="outline" asChild disabled={busy}>
            <label className="cursor-pointer">
              Upload new avatar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => uploadAvatar(e.target.files?.[0])}
              />
            </label>
          </Button>
        </div>
      </div>
      <form onSubmit={saveName} className="flex flex-col gap-3">
        <Label htmlFor="full-name">Full name</Label>
        <Input id="full-name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="self-start" disabled={busy}>
          Save name
        </Button>
      </form>
    </Card>
  );
}
