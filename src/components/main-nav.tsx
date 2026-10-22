"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/content/new", label: "New content" },
];

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" || /^\/content\/(?!new)/.test(pathname) : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 py-3 text-[15px] no-underline",
              active ? "border-cyan-300 font-bold text-white" : "border-transparent font-semibold text-ice-100/70 hover:text-white"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
