"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";
import io from "socket.io-client";
import { OfflineIndicator } from "./offline-indicator";
import { AuthActions } from "./auth-actions";
import { ThemeToggle } from "./theme-toggle";
import { SOSButton } from "./sos-button";
import { LowBandwidthToggle } from "./low-bandwidth-toggle";
import { useTranslation } from "./i18n-provider";
import type { Language } from "@/lib/i18n/dictionaries";

const MapIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ListIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const BellIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const HomeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const ChatIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

const navigationKeys = [
  { href: "/", labelKey: "home", icon: <HomeIcon /> },
  { href: "/dashboard", labelKey: "dashboard", icon: <MapIcon /> },
  { href: "/my-requests", labelKey: "myRequests", icon: <ListIcon /> },
  { href: "/coordinator", labelKey: "coordinator", icon: <ShieldIcon /> },
] as const;

export function AppShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [chatNotificationCount, setChatNotificationCount] = useState(0);
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    if (!session?.user?.id) return;
    
    const socket = io("http://localhost:3001");
    
    socket.on("connect", () => {
      socket.emit("join_user_room", session.user.id);
    });

    socket.on("new_chat_notification", (data) => {
      // Avoid incrementing if the user is currently ON the request detail page
      if (pathname !== `/requests/${data.requestId}`) {
        setChatNotificationCount((prev) => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.user?.id, pathname]);

  const visibleNavigation = navigationKeys.filter((item) => {
    if (item.href === "/") {
      return !session?.user;
    }
    if (item.href === "/coordinator") {
      return session?.user?.role === "COORDINATOR";
    }
    return true;
  });

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="glass-panel rounded-3xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1 xl:max-w-3xl">
              <Link
                href="/dashboard"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 transition hover:-translate-y-0.5 hover:bg-sky-400/15 dark:text-sky-200"
                aria-label="Go to dashboard home"
              >
                ReliefConnect
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-3xl">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-[color:var(--foreground)]/75 sm:text-base">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 xl:pb-0">
              <OfflineIndicator />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="focus-ring cursor-pointer rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)] shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
                aria-label="Select Language"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
              </select>
              <ThemeToggle />
              <LowBandwidthToggle />
              <AuthActions />
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--border)] pt-4">
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
              {visibleNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`focus-ring shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5 ${
                      isActive
                        ? "border-sky-400/40 bg-sky-400/15 text-sky-400 dark:text-sky-300 font-semibold"
                        : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]/90 hover:border-sky-400/30 hover:bg-[color:var(--surface-strong)]"
                    }`}
                  >
                    {item.icon}
                    <span>{t.common[item.labelKey as keyof typeof t.common]}</span>
                  </Link>
                );
              })}

              {/* Notifications */}
              {session?.user && (
                <Link
                  href="/notifications"
                  onClick={() => setChatNotificationCount(0)}
                  className={`relative focus-ring shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5 ${
                    pathname === "/notifications"
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-400 dark:text-sky-300 font-semibold"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]/90 hover:border-sky-400/30 hover:bg-[color:var(--surface-strong)]"
                  }`}
                >
                  <div className="relative">
                    <BellIcon />
                    {chatNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 ring-2 ring-[color:var(--background)]">
                        <span className="sr-only">{chatNotificationCount} unread</span>
                      </span>
                    )}
                  </div>
                  <span>Notifications</span>
                </Link>
              )}

              {/* Messages */}
              {session?.user && (
                <Link
                  href="/messages"
                  className={`relative focus-ring shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5 ${
                    pathname.startsWith("/messages")
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-400 dark:text-sky-300 font-semibold"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]/90 hover:border-sky-400/30 hover:bg-[color:var(--surface-strong)]"
                  }`}
                >
                  <ChatIcon />
                  <span>Messages</span>
                </Link>
              )}

              {/* Profile */}
              {session?.user && (
                <Link
                  href="/profile"
                  className={`focus-ring shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:-translate-y-0.5 ${
                    pathname === "/profile"
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-400 dark:text-sky-300 font-semibold"
                      : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)]/90 hover:border-sky-400/30 hover:bg-[color:var(--surface-strong)]"
                  }`}
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt="Profile DP" className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <UserIcon />
                  )}
                  <span>Profile</span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <SOSButton />
              <Link
                href="/requests/new"
                className="focus-ring shrink-0 flex items-center gap-2 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-400/10 transition hover:-translate-y-0.5 hover:bg-sky-300"
              >
                <PlusIcon />
                <span>{t.common.newRequest}</span>
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}