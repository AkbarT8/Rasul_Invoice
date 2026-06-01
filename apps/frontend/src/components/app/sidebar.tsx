"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, FileSpreadsheet, Moon, Search, Sun } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/proformas", label: "Proformas", icon: FileSpreadsheet }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white/80 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 lg:block">
      <div className="mb-8">
        <div className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">Proforma OS</div>
        <div className="mt-1 text-xs text-slate-500">Private order management</div>
      </div>

      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Search size={14} />
          Global search
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Search clients, notes, proformas, articles, and tracking data from the top bar.</p>
      </div>

      <div className="absolute inset-x-4 bottom-4">
        <div className="mb-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="truncate text-sm font-medium">{user?.name ?? "User"}</div>
          <div className="truncate text-xs text-slate-500">{user?.role.toLowerCase()}</div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
          <Button className="flex-1" variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
