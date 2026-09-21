import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/landing/sign-out-button";
import { cn } from "@/lib/utils";

export interface LandingUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function getInitials(user: LandingUser): string {
  const fromName = user.name
    ?.trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (fromName) {
    return fromName;
  }
  return user.email?.slice(0, 2).toUpperCase() ?? "U";
}

export function LandingHeader({ user }: { user: LandingUser | null }) {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">AI</span>
          </div>
          <span className="font-semibold text-lg">Business Builder</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span
                className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground"
                title={user.email ?? undefined}
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                    {getInitials(user)}
                  </span>
                )}
                <span className="max-w-[12rem] truncate">
                  {user.name ?? user.email}
                </span>
              </span>
              <Link
                href="/projects"
                className={buttonVariants({ size: "sm" })}
              >
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className={buttonVariants({ size: "sm" })}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}