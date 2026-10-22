import Link from "next/link";
import { Plus } from "lucide-react";

import { MainNav } from "@/components/main-nav";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="night flex flex-wrap items-center justify-between gap-4 border-b border-white/25 bg-navy-900 px-4 py-3 text-white sm:px-8">
      <div className="flex flex-wrap items-center gap-4 sm:gap-8">
        <Link href="/" className="flex items-center gap-3 text-white no-underline">
          <span aria-hidden className="h-7 w-1.5 rounded-full bg-orange-500" />
          <span className="flex flex-col gap-0.5">
            <span className="font-label text-xl leading-tight font-semibold">DrupalAsia</span>
            <span className="text-xs font-semibold tracking-[0.12em] text-ice-100/70 uppercase">Marketing CMS</span>
          </span>
        </Link>
        <MainNav />
      </div>
      <div className="flex items-center gap-4">
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/content/new">
            <Plus strokeWidth={2.5} />
            New content
          </Link>
        </Button>
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
