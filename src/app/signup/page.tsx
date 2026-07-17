import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export const metadata = {
  title: "Create Account",
  description: "Join ReliefConnect to get or give help during disasters.",
};

export default async function SignupPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="absolute top-4 left-4 z-10 sm:top-8 sm:left-8">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 transition hover:-translate-y-0.5 hover:bg-sky-400/15 dark:text-sky-200"
          aria-label="Go to homepage"
        >
          ReliefConnect
        </Link>
      </header>

      <main className="mx-auto flex flex-1 w-full max-w-7xl items-center px-4 pt-20 pb-8 sm:py-16 sm:px-6 lg:px-8">
        <section className="grid w-full gap-8 sm:gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-200">
              Account setup
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl">Create a volunteer or requester account.</h1>
            <Link href="/login" className="focus-ring inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold text-[color:var(--foreground)]/90 transition hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]">
              Already have an account? Sign in
            </Link>
          </div>
          <SignupForm />
        </section>
      </main>
    </div>
  );
}