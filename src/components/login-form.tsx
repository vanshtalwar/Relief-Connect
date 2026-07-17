"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="glass-panel mx-auto w-full max-w-md rounded-3xl p-5 sm:p-8">
      <form
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

      <div className="relative my-4 mt-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[color:var(--border)]"></div></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[color:var(--surface-strong)] px-2 text-[color:var(--foreground)]/50 font-medium">Or continue with</span></div>
      </div>

      <button type="button" onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="focus-ring flex w-full items-center justify-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm font-semibold text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--border)]">
        <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Google
      </button>
    </div>
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