"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Something went wrong.", type: "error" });
      } else {
        setMessage({ text: data.message, type: "success" });
      }
    } catch (err) {
      setMessage({ text: "An error occurred. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="absolute top-6 left-6 z-10 sm:top-8 sm:left-8">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 px-1 transition hover:-translate-y-0.5"
            aria-label="Go to homepage"
          >
            <span className="text-xl font-bold tracking-tight text-[color:var(--foreground)]">Relief<span className="text-sky-500">Connect</span></span>
          </Link>
      </header>

      <main className="mx-auto flex flex-1 w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">Reset your password</h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form className="glass-panel rounded-3xl p-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <label className="block space-y-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  required
                  placeholder="you@example.com"
                />
              </label>

              {message && (
                <div className={`rounded-xl p-4 text-sm ${message.type === "success" ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20" : "bg-red-400/10 text-red-600 dark:text-red-400 border border-red-400/20"}`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="focus-ring w-full rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50 transition hover:bg-sky-400"
              >
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </div>
            
            <div className="mt-6 text-center text-sm">
              <Link href="/login" className="text-sky-600 dark:text-sky-400 hover:underline font-medium">
                Back to sign in
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
