import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/auth";
import { LandingHeader } from "@/components/landing/landing-header";

export default async function HomePage() {
  const session = await auth();
  const user = session?.user ?? null;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader user={user} />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Describe your business.{" "}
            <span className="text-primary">We build the software.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered platform that transforms business ideas into tested,
            secure, deployable applications.
          </p>
          <div className="flex items-center justify-center gap-4">
            {user ? (
              <>
                <span className="sr-only">
                  Signed in as {user.name ?? user.email}
                </span>
                <Link
                  href="/projects"
                  className={buttonVariants({ variant: "default", size: "lg" })}
                >
                  Open Dashboard
                </Link>
                <Link
                  href="/projects"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Start a New Project
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className={buttonVariants({ variant: "default", size: "lg" })}
                >
                  Start Building
                </Link>
                <Link
                  href="/signin"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="font-semibold mb-2">Blueprint</h3>
            <p className="text-sm text-muted-foreground">
              Describe your business problem and get a structured blueprint
              before any code is written.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h3 className="font-semibold mb-2">Build</h3>
            <p className="text-sm text-muted-foreground">
              AI agents generate your application with tests, security checks,
              and production-ready code.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="font-semibold mb-2">Deploy</h3>
            <p className="text-sm text-muted-foreground">
              Preview, verify, and deploy your application with confidence.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>
            © 2026 AI Business Software Builder. All rights reserved.
            {user ? ` — Welcome back, ${user.name ?? user.email}` : ""}
          </p>
        </div>
      </footer>
    </div>
  );
}