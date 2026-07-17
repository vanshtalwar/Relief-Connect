"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) {
      setMessage({ text: "Invalid or missing token.", type: "error" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ text: "Password must be at least 8 characters long.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Failed to reset password.", type: "error" });
      } else {
        setMessage({ text: "Password reset successfully! Redirecting to login...", type: "success" });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err) {
      setMessage({ text: "An error occurred. Please try again.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6 text-center text-sm text-red-200">
        <p>Invalid or expired reset link. Please request a new one.</p>
        <Link href="/forgot-password" className="mt-4 inline-block font-semibold hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <form className="glass-panel rounded-3xl p-6" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <label className="block space-y-2 text-sm">
          <span className="text-slate-700 dark:text-slate-300">New Password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input w-full"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
          {newPassword.length > 0 && newPassword.length < 8 && (
            <span className="text-xs text-red-400">Password must be at least 8 characters long</span>
          )}
        </label>

        {message && (
          <div className={`rounded-xl p-4 text-sm ${message.type === "success" ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20" : "bg-red-400/10 text-red-600 dark:text-red-400 border border-red-400/20"}`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || newPassword.length < 8}
          className="focus-ring w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50 transition hover:bg-emerald-400"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">Create new password</h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Your new password must be different from previous used passwords.
            </p>
          </div>

          <Suspense fallback={<div className="text-center text-sm">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
