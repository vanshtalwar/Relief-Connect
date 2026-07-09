"use client";

import { useLowBandwidth } from "./low-bandwidth-provider";

export function LowBandwidthToggle() {
  const { isLowBandwidth, toggleLowBandwidth } = useLowBandwidth();

  return (
    <button
      onClick={toggleLowBandwidth}
      className={`relative focus-ring inline-flex items-center justify-center rounded-full border p-2.5 text-sm font-medium shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 ${
        isLowBandwidth 
          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-400 dark:text-emerald-300" 
          : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-emerald-400/30 hover:bg-[color:var(--surface-strong)]"
      }`}
      aria-label="Toggle Low Bandwidth Mode"
      title={isLowBandwidth ? "Low Bandwidth Mode: ON (Maps & heavy images disabled)" : "Low Bandwidth Mode: OFF"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l2-9 5 18 3-10 3 4h3"/>
        {isLowBandwidth && (
          <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2.5" />
        )}
      </svg>
    </button>
  );
}
