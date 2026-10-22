import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

// Brand palette pairs that all pass contrast with their text colour.
const PALETTE = [
  { bg: "#031a4b", fg: "#ffffff" },
  { bg: "#0462d2", fg: "#ffffff" },
  { bg: "#38d9f5", fg: "#031a4b" },
  { bg: "#f86802", fg: "#031a4b" },
  { bg: "#0342a5", fg: "#ffffff" },
];

function colourFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function UserAvatar({
  profile,
  className,
  title,
}: {
  profile: Pick<Profile, "id" | "full_name" | "avatar_url"> | null | undefined;
  className?: string;
  title?: string;
}) {
  if (!profile) return null;
  const c = colourFor(profile.id);
  return (
    <Avatar className={cn("size-8", className)} title={title ?? profile.full_name ?? undefined}>
      {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
      <AvatarFallback style={{ background: c.bg, color: c.fg }}>{initials(profile.full_name)}</AvatarFallback>
    </Avatar>
  );
}
