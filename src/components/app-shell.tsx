"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, type ReactNode } from "react";
import io from "socket.io-client";
import { OfflineIndicator } from "./offline-indicator";
import { AuthActions } from "./auth-actions";
import { ThemeToggle } from "./theme-toggle";
import { useTranslation } from "./i18n-provider";

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
  const { t } = useTranslation();

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
    const socket = io(socketUrl);

    socket.on("connect", () => {
      socket.emit("join_user_room", session.user.id);
    });

    socket.on("new_chat_notification", (data) => {
      // Avoid incrementing if the user is currently ON the request detail page
      if (pathnameRef.current !== `/requests/${data.requestId}`) {
        setChatNotificationCount((prev) => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.user?.id]);

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
    <div className="min-h-screen bg-[color:var(--background)] flex flex-col font-sans relative">
      {/* Top Bar Container */}
      <div className="sticky top-5 z-50 w-full px-5 sm:px-8 flex items-center justify-between pointer-events-none">
        
        {/* LEFT: ReliefConnect Logo */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/dashboard"
            className="focus-ring flex items-center justify-center h-9 w-9 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] transition-colors hover:bg-[#38bdf8]/20 shadow-sm"
            aria-label="Go to dashboard home"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </Link>
          <span className="hidden md:inline font-bold text-[color:var(--foreground)] text-[13px] uppercase tracking-[0.15em]">ReliefConnect</span>
        </div>

        {/* CENTER: Floating Pill Navbar (Tabs Only) */}
        <header className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:absolute md:top-1/2 md:-translate-y-1/2 md:bottom-auto flex h-[52px] items-center justify-center rounded-full bg-[color:var(--muted)]/95 border border-[color:var(--border)] px-2 sm:px-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] md:shadow-2xl backdrop-blur-xl pointer-events-auto w-[90%] sm:w-auto overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 w-full sm:w-auto">
            {visibleNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`focus-ring shrink-0 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                    isActive
                      ? "text-[color:var(--background)] bg-[color:var(--foreground)] shadow-sm"
                      : "text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)] hover:bg-[color:var(--foreground)]/10"
                  }`}
                >
                  <span className="hidden sm:inline-block">{item.icon}</span>
                  <span>{t.common[item.labelKey as keyof typeof t.common]}</span>
                </Link>
              );
            })}

            {/* Notifications */}
            {session?.user && (
              <Link
                href="/notifications"
                onClick={() => setChatNotificationCount(0)}
                className={`relative shrink-0 focus-ring flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                  pathname === "/notifications"
                    ? "text-[color:var(--background)] bg-[color:var(--foreground)] shadow-sm"
                    : "text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)] hover:bg-[color:var(--foreground)]/10"
                }`}
              >
                <div className="relative hidden sm:block">
                  <BellIcon />
                  {chatNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-[color:var(--muted)]" />
                  )}
                </div>
                <span>Notifications</span>
                {/* Mobile red dot fallback */}
                {chatNotificationCount > 0 && <span className="sm:hidden h-1.5 w-1.5 rounded-full bg-red-500 ml-1" />}
              </Link>
            )}

            {/* Messages */}
            {session?.user && (
              <Link
                href="/messages"
                className={`shrink-0 focus-ring flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                  pathname.startsWith("/messages")
                    ? "text-[color:var(--background)] bg-[color:var(--foreground)] shadow-sm"
                    : "text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)] hover:bg-[color:var(--foreground)]/10"
                }`}
              >
                <span className="hidden sm:inline-block"><ChatIcon /></span>
                <span>Messages</span>
              </Link>
            )}

            {/* Profile */}
            {session?.user && (
              <Link
                href="/profile"
                className={`shrink-0 focus-ring flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] transition-all ${
                  pathname === "/profile"
                    ? "text-[color:var(--background)] bg-[color:var(--foreground)] shadow-sm"
                    : "text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)] hover:bg-[color:var(--foreground)]/10"
                }`}
              >
                <span className="hidden sm:inline-block">
                  {session.user.image ? (
                    <img src={session.user.image} alt="DP" className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <UserIcon />
                  )}
                </span>
                <span>Profile</span>
              </Link>
            )}
          </nav>
        </header>

        {/* RIGHT: Theme & Logout */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <ThemeToggle />
          <AuthActions />
        </div>
      </div>

      {/* Main Content Area */}
      {/* On mobile, pb-24 adds space for the fixed bottom bar */}
      <main className="mx-auto flex w-full flex-1 max-w-7xl flex-col gap-5 px-4 pt-16 pb-24 md:pb-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}