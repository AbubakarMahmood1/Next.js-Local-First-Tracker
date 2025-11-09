import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-center">
          Job Tracker
        </h1>
        <p className="text-xl text-center text-muted-foreground">
          Local-First Application Tracking
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-border px-6 py-3 hover:bg-accent transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
