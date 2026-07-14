"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RequestsModal, type Filter } from "./requests-modal";

export function AnalyticsDashboard({ summary }: { summary: { total: number; open: number; claimed: number; resolved: number; activeVolunteers: number; resolutionRate: number; requestSeries: Array<{ label: string; value: number }>; categorySeries: Array<{ name: string; value: number }> } }) {
  const router = useRouter();
  const pieColors = ["#38bdf8", "#0f766e", "#f97316", "#dc2626", "#16a34a", "#eab308"];

  const [modalFilter, setModalFilter] = useState<Filter>(null);

  return (
    <div className="flex flex-col gap-5">
      <StatGrid summary={summary} onStatClick={setModalFilter} />
      
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-[color:var(--border)] px-4 py-3 bg-[color:var(--surface)]">
            <h3 className="text-[13px] font-medium text-[color:var(--foreground)] tracking-wide">Requests Over Time</h3>
          </div>
          <div className="p-5 h-72">
            <ResponsiveContainer>
              <AreaChart
                data={summary.requestSeries}
                onClick={(data) => {
                  const activeLabel = data?.activeLabel;
                  if (activeLabel !== undefined && activeLabel !== null) {
                    setModalFilter({ type: "date", value: String(activeLabel) });
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--foreground)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--foreground)" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }} itemStyle={{ color: "#38bdf8" }} />
                <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fill="#38bdf8" fillOpacity={0.1} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="border-b border-[color:var(--border)] px-4 py-3 bg-[color:var(--surface)]">
            <h3 className="text-[13px] font-medium text-[color:var(--foreground)] tracking-wide">Requests By Category</h3>
          </div>
          <div className="p-5 h-72">
            <ResponsiveContainer>
              <BarChart
                data={summary.categorySeries}
                onClick={(data) => {
                  const activeLabel = data?.activeLabel;
                  if (activeLabel !== undefined && activeLabel !== null) {
                    setModalFilter({ type: "category", value: String(activeLabel) });
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--foreground)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--foreground)" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }} cursor={{ fill: 'var(--surface-strong)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {summary.categorySeries.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <RequestsModal filter={modalFilter} onClose={() => setModalFilter(null)} />
    </div>
  );
}

function StatGrid({ summary, onStatClick }: { summary: { total: number; open: number; claimed: number; resolved: number; activeVolunteers: number; resolutionRate: number }; onStatClick: (filter: { type: any, value: string }) => void }) {
  const stats = [
    { label: "Total requests", value: summary.total, desc: "Cumulative requests logged", color: "text-[color:var(--foreground)]", filter: { type: "all", value: "All" } },
    { label: "Open status", value: summary.open, desc: "Pending volunteer review", color: "text-[#D0A24C]", filter: { type: "status", value: "OPEN" } },
    { label: "Claimed / active", value: summary.claimed, desc: "Volunteers currently on-site", color: "text-[#38bdf8]", filter: { type: "status", value: "CLAIMED" } },
    { label: "Resolved requests", value: summary.resolved, desc: "Disaster recovery complete", color: "text-[#3FA37E]", filter: { type: "status", value: "RESOLVED" } },
    { label: "Active volunteers", value: summary.activeVolunteers, desc: "Helpers deployed in field", color: "text-[#A78BFA]", filter: null },
    { label: "Resolution rate", value: `${summary.resolutionRate}%`, desc: "Disaster response success rate", color: "text-[#2DD4BF]", filter: null },
  ];

  return (
    <div className="grid gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          onClick={() => stat.filter && onStatClick(stat.filter)}
          className={`bg-[color:var(--muted)] border border-[color:var(--border)] rounded-xl p-5 transition-colors duration-200 shadow-sm ${stat.filter ? 'cursor-pointer hover:bg-[color:var(--surface)]' : ''}`}
        >
          <p className="text-[10px] uppercase tracking-wider text-[color:var(--foreground)]/50 font-medium">{stat.label}</p>
          <p className={`mt-3 text-2xl font-medium tracking-tight ${stat.color}`}>{stat.value}</p>
          <p className="mt-2 text-[11px] text-[color:var(--foreground)]/70 leading-snug">{stat.desc}</p>
        </div>
      ))}
    </div>
  );
}