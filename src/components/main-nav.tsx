"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "My work" },
  { href: "/board", label: "Board" },
  { href: "/blogs", label: "Blogs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/guidelines", label: "Content guidelines" },
];

/** Owner-only links. */
const OWNER_LINKS = [{ href: "/updates", label: "Updates" }];

export function MainNav({ isOwner = false }: { isOwner?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1">
      {[...LINKS, ...(isOwner ? OWNER_LINKS : [])].map((l) => {
        const active =
          l.href === "/"
            ? pathname === "/"
            : l.href === "/board"
              ? pathname.startsWith("/board") || /^\/content\/(?!new)/.test(pathname)
              : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-3 text-[15px] no-underline",
              active
                ? "border-cyan-300 font-bold text-white"
                : "border-transparent font-semibold text-ice-100/70 hover:text-white",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
