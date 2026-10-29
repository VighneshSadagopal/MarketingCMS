import Link from "next/link";
import { Plus } from "lucide-react";

import { MainNav } from "@/components/main-nav";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { canCreateContent, type Profile } from "@/lib/types";

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
        {/* The only way to add content from the header, so it stays visible on phones (icon only there). */}
        {canCreateContent(profile) ? (
          <Button asChild className="max-sm:size-11 max-sm:px-0">
            <Link href="/content/new" aria-label="New content">
              <Plus strokeWidth={2.5} />
              <span className="max-sm:sr-only">New content</span>
            </Link>
          </Button>
        ) : null}
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
