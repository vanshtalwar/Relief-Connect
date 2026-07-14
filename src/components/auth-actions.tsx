"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AuthActions() {
  const { data: session } = useSession();

  const UserIcon = () => (
    <svg className="h-4 w-4 text-[color:var(--foreground)]/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const userName = session?.user?.name ?? "Profile";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-2 sm:px-4 sm:py-2 text-sm text-[color:var(--foreground)]/90 transition hover:-translate-y-0.5 hover:border-red-400/40 hover:bg-[color:var(--surface-strong)] flex items-center justify-center"
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Logout"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span className="hidden sm:inline ml-2">Logout</span>
      </button>
    </div>
  );
}