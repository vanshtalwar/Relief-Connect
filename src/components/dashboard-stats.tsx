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
    { label: "Volunteers", value: summary.activeVolunteers, color: "indigo" as const, icon: "🤝", delay: "200", filter: null },
    { label: "Success", value: `${summary.resolutionRate}%`, color: "violet" as const, icon: "📈", delay: "250", filter: null },
  ];

  return (
    <>
      <section className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} onClick={() => stat.filter && setModalFilter(stat.filter)} />
        ))}
      </section>
      
      <RequestsModal filter={modalFilter} onClose={() => setModalFilter(null)} />
    </>
  );
}

function StatCard({ label, value, color = "neutral", icon, delay, onClick, filter }: { label: string; value: string | number; color?: "neutral" | "amber" | "sky" | "emerald" | "indigo" | "violet"; icon: string; delay: string; onClick: () => void; filter: Filter }) {
  const colorMap = {
    neutral: "text-[color:var(--foreground)] opacity-80 group-hover:opacity-100",
    amber: "text-amber-500 group-hover:text-amber-400",
    sky: "text-[#38bdf8] group-hover:text-sky-300",
    emerald: "text-[#3FA37E] group-hover:text-emerald-400",
    indigo: "text-indigo-400 group-hover:text-indigo-300",
    violet: "text-violet-400 group-hover:text-violet-300",
  };
  
  const borderMap = {
    neutral: "hover:border-[color:var(--border-strong)]",
    amber: "hover:border-amber-500/30",
    sky: "hover:border-[#38bdf8]/30",
    emerald: "hover:border-[#3FA37E]/40",
    indigo: "hover:border-indigo-500/30",
    violet: "hover:border-violet-500/30",
  };

  return (
    <div 
      onClick={onClick}
      className={`group bg-[color:var(--muted)] border border-[color:var(--border)] rounded-2xl p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:bg-[color:var(--surface)] ${borderMap[color]} ${filter ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[color:var(--foreground)]/50 transition-colors group-hover:text-[color:var(--foreground)]/70">{label}</p>
        <span className="text-[16px] opacity-70 grayscale transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110">{icon}</span>
      </div>
      <p className={`text-3xl font-bold tracking-tight transition-colors ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
