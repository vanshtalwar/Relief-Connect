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
      className="glass-panel mx-auto w-full max-w-md rounded-3xl p-5 sm:p-8"
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
          <PasswordInput name="password" />
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

function PasswordInput({ name, placeholder, minLength, required }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input 
        name={name} 
        type={show ? "text" : "password"} 
        className="input w-full pr-10" 
        placeholder={placeholder} 
        minLength={minLength} 
        required={required} 
      />
      <button 
        type="button" 
        onClick={() => setShow(!show)} 
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)]/80 transition-colors"
        tabIndex={-1}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        )}
      </button>
    </div>
  );
}