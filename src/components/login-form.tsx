"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="glass-panel mx-auto w-full max-w-md rounded-3xl p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const result = await signIn("credentials", {
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          redirect: false,
          callbackUrl: "/dashboard",
        });
        if (result?.error) {
          setError("Unable to sign in with those credentials.");
          return;
        }

        router.push(result?.url ?? "/dashboard");
      }}
    >
      <div className="space-y-6">
        <Field label="Email">
          <input name="email" type="email" className="input" defaultValue="" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" className="input" defaultValue="" />
          <div className="flex justify-end mt-1">
            <Link href="/forgot-password" className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline">
              Forgot your password?
            </Link>
          </div>
        </Field>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button type="submit" className="focus-ring w-full rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950">Sign in</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}