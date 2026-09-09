"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AuthActions() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[#38bdf8]/50 hover:bg-[color:var(--surface-strong)] shadow-sm"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-2 sm:px-3 sm:py-1.5 text-xs text-[color:var(--foreground)]/90 transition hover:-translate-y-0.5 hover:border-red-400/40 hover:bg-[color:var(--surface-strong)] flex items-center justify-center shadow-sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Logout"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="hidden sm:inline ml-1.5 font-medium">Logout</span>
      </button>
    </div>
  );
}