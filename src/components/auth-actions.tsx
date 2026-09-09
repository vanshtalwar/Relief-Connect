"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { getAvatarUrl } from "@/lib/avatar";

export function AuthActions() {
  const { data: session } = useSession();
  const [imageError, setImageError] = useState(false);

  const userName = session?.user?.name ?? "Profile";
  const rawImage = session?.user?.image;
  const userImage = !imageError ? getAvatarUrl(rawImage) : null;

  return (
    <div className="flex items-center gap-2">
      {session?.user && (
        <Link
          href="/profile"
          className="focus-ring flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1 sm:px-2.5 sm:py-1 text-xs text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[#38bdf8]/50 hover:bg-[color:var(--surface-strong)] group shadow-sm"
          title={`Signed in as ${userName}`}
        >
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="h-6 w-6 rounded-full object-cover border border-[#38bdf8]/40 shrink-0 group-hover:ring-2 group-hover:ring-[#38bdf8]/30 transition-all"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-[color:var(--surface-strong)] border border-[color:var(--border)] flex items-center justify-center text-xs shrink-0">
              👤
            </div>
          )}
          <span className="hidden sm:inline font-semibold text-xs text-[color:var(--foreground)] truncate max-w-[100px]">
            {userName}
          </span>
        </Link>
      )}

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