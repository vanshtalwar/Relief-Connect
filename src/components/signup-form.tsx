"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { signupSchema } from "@/lib/schemas";
import { roles } from "@/lib/constants";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [formDataState, setFormDataState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleStep1(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? "VICTIM"),
      phone: String(formData.get("phone") ?? ""),
    };

    const parsed = signupSchema.safeParse(payload);
    if (!parsed.success) {
      setError("Check the form fields and try again.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "That email is already registered.");
        setIsLoading(false);
        return;
      }

      setFormDataState(parsed.data);
      setStep(2);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOTP() {
    if (!formDataState) return;
    setResendMessage(null);
    setError(null);
    setIsResending(true);
    
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formDataState),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to resend code.");
      } else {
        setResendMessage("Verification code resent successfully!");
        // Clear success message after 5 seconds
        setTimeout(() => setResendMessage(null), 5000);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  async function handleStep2(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const otp = String(formData.get("otp") ?? "");

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      setIsLoading(false);
      return;
    }

    try {
      const payload = { ...formDataState, otp };
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid verification code.");
        setIsLoading(false);
        return;
      }

      // Automatically log the user in
      const result = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Account created, but error signing in. Please log in manually.");
        router.push("/login");
        return;
      }

      router.push(result?.url ?? "/dashboard");
    } catch (err) {
      setError("Verification failed. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="glass-panel mx-auto w-full max-w-lg rounded-3xl p-5 sm:p-8 relative overflow-hidden">
      {step === 1 && (
        <form onSubmit={handleStep1} className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-[color:var(--foreground)]">Create your account</h2>
            <p className="text-sm text-[color:var(--foreground)]/60 mt-1">Join the community to get or give help</p>
          </div>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            <Field label="Full name"><input name="name" className="input" required minLength={2} disabled={isLoading} /></Field>
            <Field label="Email"><input name="email" type="email" className="input" required disabled={isLoading} /></Field>
            <Field label="Password">
              <PasswordInput name="password" minLength={8} placeholder="At least 8 characters" required disabled={isLoading} />
            </Field>
            <Field label="Role">
              <select name="role" className="input" disabled={isLoading}>
                {roles.filter((role) => role !== "COORDINATOR").map((role) => <option key={role} value={role}>{role === "VICTIM" ? "Victim (I need help)" : "Volunteer (I want to help)"}</option>)}
              </select>
            </Field>
            <Field label="Phone"><input name="phone" type="tel" className="input sm:col-span-2" placeholder="e.g. +1234567890" required disabled={isLoading} /></Field>
          </div>
          
          {error && <p className="mt-4 text-sm text-red-400 font-medium text-center">{error}</p>}
          
          <button type="submit" disabled={isLoading} className="focus-ring mt-6 w-full rounded-full bg-sky-500 hover:bg-sky-400 px-4 py-3.5 text-sm font-bold text-slate-950 transition-colors disabled:opacity-50">
            {isLoading ? "Sending Code..." : "Continue"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2} className="animate-in fade-in slide-in-from-right-4 duration-300">
          <button 
            type="button" 
            onClick={() => { setStep(1); setError(null); }}
            className="absolute top-5 left-5 text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)] p-1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>

          <div className="mb-8 mt-2 text-center">
            <div className="mx-auto w-12 h-12 bg-sky-500/10 text-sky-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[color:var(--foreground)]">Verify your email</h2>
            <p className="text-sm text-[color:var(--foreground)]/70 mt-2 px-4">
              We sent a 6-digit verification code to <br/>
              <span className="font-semibold text-[color:var(--foreground)]">{formDataState?.email}</span>
            </p>
          </div>

          <div className="px-4 sm:px-8">
            <Field label="Verification Code">
              <input 
                name="otp" 
                type="text" 
                maxLength={6} 
                className="input text-center text-2xl tracking-[0.5em] font-mono py-4 font-bold" 
                placeholder="------" 
                required 
                autoComplete="one-time-code"
                disabled={isLoading} 
              />
            </Field>
          </div>
          
          
          {error && <p className="mt-4 text-sm text-red-400 font-medium text-center">{error}</p>}
          {resendMessage && <p className="mt-4 text-sm text-green-500 font-medium text-center">{resendMessage}</p>}
          
          <button type="submit" disabled={isLoading || isResending} className="focus-ring mt-8 w-full rounded-full bg-sky-500 hover:bg-sky-400 px-4 py-3.5 text-sm font-bold text-slate-950 transition-colors disabled:opacity-50">
            {isLoading ? "Verifying..." : "Verify & Create Account"}
          </button>
          
          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={handleResendOTP} 
              disabled={isResending || isLoading} 
              className="text-sm font-medium text-sky-500 hover:text-sky-400 transition-colors disabled:opacity-50"
            >
              {isResending ? "Resending..." : "Didn't receive a code? Resend"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-slate-700 dark:text-slate-300 font-medium ml-1">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({ name, placeholder, minLength, required, disabled }: any) {
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
        disabled={disabled}
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