"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/cases", label: "Cases" },
  { href: "/clients", label: "Clients" },
  { href: "/users", label: "Users" },
  { href: "/roles", label: "Roles" },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-900 text-white">
      <div className="p-6">
        <Link href="/" className="text-xl font-semibold tracking-tight text-amber-400">
          Law Portal
        </Link>
      </div>
      <nav className="space-y-0.5 px-3 pb-6">
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={
              "block rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
              (pathname === href || (href !== "/" && pathname.startsWith(href))
                ? "bg-slate-800 text-amber-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-white")
            }
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
