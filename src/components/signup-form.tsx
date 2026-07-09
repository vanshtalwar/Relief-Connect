"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { signupSchema } from "@/lib/schemas";
import { roles } from "@/lib/constants";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="glass-panel mx-auto w-full max-w-lg rounded-3xl p-6"
      onSubmit={async (event) => {
        event.preventDefault();
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
          return;
        }

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        if (!response.ok) {
          setError("That email is already registered.");
          return;
        }

        // Automatically log the user in
        const result = await signIn("credentials", {
          email: parsed.data.email,
          password: parsed.data.password,
          redirect: false,
          callbackUrl: "/dashboard",
        });

        if (result?.error) {
          setError("Account created, but error signing in. Please log in manually.");
          router.push("/login");
          return;
        }

        router.push(result?.url ?? "/dashboard");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><input name="name" className="input" /></Field>
        <Field label="Email"><input name="email" type="email" className="input" /></Field>
        <Field label="Password"><input name="password" type="password" className="input" /></Field>
        <Field label="Role">
          <select name="role" className="input">
            {roles.filter((role) => role !== "COORDINATOR").map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </Field>
        <Field label="Phone"><input name="phone" className="input sm:col-span-2" /></Field>
      </div>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <button type="submit" className="focus-ring mt-5 w-full rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950">Create account</button>
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