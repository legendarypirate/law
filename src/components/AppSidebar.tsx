"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Briefcase, Users, UserCog, Shield, ScrollText, FolderTree, ListTodo, FileText, Settings } from "lucide-react";

const nav = [
  { href: "/", label: "Самбар", icon: LayoutDashboard },
  { href: "/cases", label: "Хэргүүд", icon: Briefcase },
  { href: "/settings", label: "Тохиргоо", icon: Settings },
  { href: "/case-types", label: "Хэргийн төрөл", icon: FolderTree },
  { href: "/case-classifications", label: "Хэргийн зүйлчлэл", icon: FileText },
  { href: "/investigator-action-types", label: "Мөрдөгчийн ажиллагаа", icon: FileText },
  { href: "/clients", label: "Харилцагчид", icon: Users },
  { href: "/users", label: "Хэрэглэгчид", icon: UserCog },
  { href: "/roles", label: "Эрх", icon: Shield },
  { href: "/audit", label: "Үйлдлийн бүртгэл", icon: ScrollText },
  { href: "/tasks", label: "Дотоод даалгавар", icon: ListTodo },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-primary"
        >
          Хууль зүйн портал
        </Link>
      </div>
      <nav className="space-y-0.5 px-3 pb-6">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || (href !== "/" && pathname.startsWith(href))
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
