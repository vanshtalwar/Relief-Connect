"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const SunIcon = () => (
    <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
    </svg>
  );

  const MoonIcon = () => (
    <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );

  // Prevent SSR/hydration mismatch by defaulting to server layout (dark/SunIcon) before client mount
  const isDark = !mounted || theme === "dark";

  return (
    <button
      type="button"
      className="focus-ring inline-flex items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-2.5 text-sm font-medium text-[color:var(--foreground)] shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-[color:var(--surface-strong)]"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}