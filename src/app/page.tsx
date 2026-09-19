import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">AI</span>
            </div>
            <span className="font-semibold text-lg">Business Builder</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/signin"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

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
            <Link
              href="/signup"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90"
            >
              Start Building
            </Link>
            <Link
              href="/signin"
              className="border border-border px-6 py-3 rounded-md font-medium hover:bg-accent"
            >
              Sign In
            </Link>
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
          <p>© 2026 AI Business Software Builder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
