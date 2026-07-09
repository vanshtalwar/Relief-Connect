import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="absolute top-6 left-6 z-10 sm:top-8 sm:left-8">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 transition hover:-translate-y-0.5 hover:bg-sky-400/15 dark:text-sky-200"
          aria-label="Go to homepage"
        >
          ReliefConnect
        </Link>
      </header>

      <main className="mx-auto flex flex-1 w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <section className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-200">
              Secure sign in
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl">Sign in to coordinate support in real time.</h1>
            <p className="max-w-xl text-lg leading-8 text-slate-700 dark:text-slate-300">
              Demo credentials are seeded for victim, volunteer, and coordinator roles so the full flow can be exercised immediately.
            </p>
            <Link href="/signup" className="focus-ring inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)]/90 transition hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]">
              Need an account? Sign up
            </Link>
          </div>
          <LoginForm />
        </section>
      </main>
    </div>
  );
}