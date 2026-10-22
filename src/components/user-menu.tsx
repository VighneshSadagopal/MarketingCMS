"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile }) {
  const router = useRouter();
  const name = profile.full_name ?? "Account";

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${name}`}
        className="flex cursor-pointer items-center gap-3 rounded-md py-1 pr-2 pl-1 text-white"
      >
        <UserAvatar
          profile={profile}
          className="size-10 shadow-[0_0_0_2px_var(--navy-900),0_0_0_4px_var(--cyan-300)]"
        />
        <span className="hidden flex-col items-start gap-0.5 sm:flex">
          <span className="text-sm font-bold">{name}</span>
          <span className="text-xs text-ice-100/70 capitalize">{profile.role}</span>
        </span>
        <ChevronDown className="size-4" strokeWidth={2.5} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="block font-bold">{name}</span>
          <span className="block text-xs text-muted-foreground capitalize">{profile.role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /> Profile and avatar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
