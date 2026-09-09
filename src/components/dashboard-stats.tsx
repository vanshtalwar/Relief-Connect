"use client";

import { useState } from "react";
import { RequestsModal, type Filter } from "./requests-modal";

export function DashboardStats({ summary }: { summary: any }) {
  const [modalFilter, setModalFilter] = useState<Filter>(null);

  const stats = [
    { label: "Total", value: summary.total, color: "neutral" as const, icon: "📋", delay: "0", filter: { type: "all", value: "All" } },
    { label: "Open", value: summary.open, color: "amber" as const, icon: "🚨", delay: "50", filter: { type: "status", value: "OPEN" } },
    { label: "Claimed", value: summary.claimed, color: "sky" as const, icon: "⏳", delay: "100", filter: { type: "status", value: "CLAIMED" } },
    { label: "Resolved", value: summary.resolved, color: "emerald" as const, icon: "✅", delay: "150", filter: { type: "status", value: "RESOLVED" } },
  ];

  return (
    <>
      <section className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} onClick={() => stat.filter && setModalFilter(stat.filter)} />
        ))}
      </section>
      
      <RequestsModal filter={modalFilter} onClose={() => setModalFilter(null)} />
    </>
  );
}

function StatCard({ 
  label, 
  value, 
  color = "neutral", 
  icon, 
  delay, 
  onClick, 
  filter 
}: { 
  label: string; 
  value: string | number; 
  color?: "neutral" | "amber" | "sky" | "emerald"; 
  icon: string; 
  delay: string; 
  onClick: () => void; 
  filter: Filter;
}) {
  const colorMap = {
    neutral: "text-[color:var(--foreground)] opacity-80 group-hover:opacity-100",
    amber: "text-amber-500 group-hover:text-amber-400",
    sky: "text-[#38bdf8] group-hover:text-sky-300",
    emerald: "text-[#3FA37E] group-hover:text-emerald-400",
  };
  
  const borderMap = {
    neutral: "hover:border-[color:var(--border-strong)]",
    amber: "hover:border-amber-500/30",
    sky: "hover:border-[#38bdf8]/30",
    emerald: "hover:border-[#3FA37E]/40",
  };

  return (
    <div 
      onClick={onClick}
      className={`group bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:bg-[color:var(--surface)] ${borderMap[color]} ${filter ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-4">
        <p className="text-[10px] sm:text-[11px] text-left font-semibold uppercase tracking-wider sm:tracking-[0.15em] text-[color:var(--foreground)]/60 transition-colors group-hover:text-[color:var(--foreground)]/80">{label}</p>
        <span className="text-[15px] sm:text-[18px] opacity-75 grayscale transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110">{icon}</span>
      </div>
      <p className={`text-xl sm:text-3xl text-left font-bold tracking-tight transition-colors ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
