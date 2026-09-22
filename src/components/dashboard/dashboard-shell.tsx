"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity,
  FolderKanban,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Monitoring", href: "/monitoring", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

export interface DashboardUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function getInitials(user: DashboardUser): string {
  const fromName = user.name
    ?.trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (fromName) return fromName;
  return user.email?.slice(0, 2).toUpperCase() ?? "U";
}

function Brand() {
  return (
    <Link
      href="/projects"
      className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <span className="text-sm font-bold text-primary-foreground">AI</span>
      </div>
      <span className="text-[15px] font-semibold tracking-tight">
        Business Builder
      </span>
    </Link>
  );
}

function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ user }: { user: DashboardUser }) {
  const handleSignOut = () => signOut({ callbackUrl: "/" });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-4">
        <Brand />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks />
      </div>
      <div className="flex items-center justify-between gap-2 border-t px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {getInitials(user)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">
              {user.name ?? "Account"}
            </div>
            <div className="truncate text-[12px] text-muted-foreground">
              {user.email}
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-1 w-full justify-start gap-2 text-muted-foreground"
          )}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r bg-background shadow-lg">
            <div className="absolute right-3 top-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <SidebarContent user={user} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-background lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}